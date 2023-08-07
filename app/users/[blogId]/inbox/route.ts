import { prisma } from "@/lib/db";
import { parseSignatureHeader, verifyRequestSignature } from "@/lib/server-util";
import crypto, { webcrypto } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: { blogId: string } }) {
    const json = await request.json();
    console.log('json', json)
    const { type, object } = json;
    const keyId = parseSignatureHeader(request.headers.get('Signature')!).keyId;
    const actor = await (await fetch(keyId, {
        headers: {
            'Accept': 'application/activity+json',
        },
    })).json();
    const actorPublicKey = actor.publicKey.publicKeyPem;
    const verified = await verifyRequestSignature(request, actorPublicKey);

    if (!verified) {
        return NextResponse.json({ message: 'Signature verification failed' }, { status: 400 });
    }

    const blog = await prisma.blog.findUnique({
        where: {
            slug: params.blogId,
        },
    });

    if (!blog) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }


    if (type === 'Follow') {
        console.log('follow', json, object);


        try {
            console.log('creating follow row')
            await prisma.follow.create({
                data: {
                    accountId: blog.id,
                    targetAccountId: json.actor,
                },
            });
        } catch (e) {
            console.log(e);
        }

        const entity = {
            '@context': 'https://www.w3.org/ns/activitystreams',
            type: 'Accept',
            actor: `${process.env.NEXT_PUBLIC_URL}/users/${blog.slug}`,
            object: {
                '@context': 'https://www.w3.org/ns/activitystreams',
                id: json.id,
                type: 'Follow',
                actor: json.actor,
                object: json.object,
            }
        };
        console.log(entity)

        const digestHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(entity))
            .digest('base64');
        const digestHeader = `SHA-256=${digestHash}`;


        const now = new Date();
        const request: Request = new Request(actor.inbox, {
            method: 'POST',
            headers: {
                'Host': new URL(actor.inbox).host,
                'Content-Type': 'application/activity+json',
                'Date': now.toUTCString(),
                'Digest': digestHeader,
            },
            body: JSON.stringify(entity),
        })

        const includeHeaders = ['(request-target)', 'host', 'date', 'digest'];
        const stringToSign = getStringToSign(request, includeHeaders);
        const privateKey = crypto.createPrivateKey(blog.privateKey!);
        const signature = crypto.sign('sha256', Buffer.from(stringToSign), {
            key: privateKey,
        }).toString('base64');
    
        console.log('stringToSign:', stringToSign);
        console.log('signature:', signature);
        console.log('public key:', blog.publicKey!)

        const keyId = getKeyIdForBlog(blog.slug);
        console.log('keyId', keyId)
        const signatureHeader = `keyId="${keyId}",algorithm="rsa-sha256",headers="${includeHeaders.join(' ')}",signature="${signature}"`;
        const r = await fetch(actor.inbox, {
            method: 'POST',
            headers: {
                'Host': new URL(actor.inbox).host,
                'Content-Type': 'application/activity+json',
                'Date': now.toUTCString(),
                'Digest': digestHeader,
                'Signature': signatureHeader,
            },
            body: JSON.stringify(entity),
        });
        console.log('???', r.statusText, r.status)

        return NextResponse.json({ message: 'Success' });
    } else if (type === 'Undo' && object.type === 'Follow') {
        console.log('undo follow', object);
        try {
            console.log('deleting follow row')
            await prisma.follow.delete({
                where: {
                    accountId_targetAccountId: {
                        accountId: blog.id,
                        targetAccountId: object.actor,
                    },
                },
            });
        } catch (e) {
            console.log(e);
        }
    }

    return NextResponse.json({ message: 'ok' });
}

function getKeyIdForBlog(blogId: string) {
    return `${process.env.NEXT_PUBLIC_URL}/users/${blogId}#main-key`;
}

function getStringToSign(request: Request, includeHeaders: string[]) {
    const headers = request.headers;
    const includeHeaderStrings = includeHeaders.map((header) => {
        if (header === '(request-target)') {
            const url = new URL(request.url);
            return `(request-target): ${request.method.toLowerCase()} ${url.pathname}${url.search}`;
        } else {
            return `${header}: ${headers.get(header)}`;
        }
    });

    return includeHeaderStrings.join('\n');
}
