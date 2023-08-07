import { NextRequest, NextResponse } from "next/server";
import crypto, { webcrypto } from 'crypto';
import { prisma } from "@/lib/db";
import { parseSignatureHeader, verifyRequestSignature } from "@/lib/server-util";

export async function POST(request: NextRequest) {
    const { type, object } = await request.json();
    console.log('server inbox', type, object);

    let blogSlug;
    if (type === 'Undo' && object.type === 'Follow') {
        blogSlug = new URL(object.object).pathname.split('/').pop();
    } else if (type === 'Follow') {
        blogSlug = new URL(object).pathname.split('/').pop();
    } else {
        return {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({ message: 'Invalid request' }),
        };
    }

    const blog = await prisma.blog.findFirst({
        where: {
            slug: blogSlug,
        },
    });
    if (!blog) {
        return {
            status: 404,
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({ message: 'User not found' }),
        };
    }

    const keyId = parseSignatureHeader(request.headers.get('Signature')!).keyId;
    const actor = await(await fetch(keyId, {
        headers: {
            'Accept': 'application/activity+json',
        },
    })).json();
    console.log(actor);
    const actorPublicKey = actor.publicKey.publicKeyPem;
    const verified = await verifyRequestSignature(request, actorPublicKey);

    if (verified) {
        const follow = await prisma.follow.findFirst({
            where: {
                targetAccountId: actor.id,
                accountId: blog.id,
            },
        });
        if (follow && type === 'Undo' && object.type === 'Follow') {
            console.log('undo follow')
            await prisma.follow.delete({
                where: {
                    id: follow.id,
                },
            });
            return NextResponse.json({ message: 'Success' });
        } else if (!follow && type === 'Follow') {
            await prisma.follow.create({
                data: {
                    targetAccountId: actor.id,
                    accountId: blog.id,
                },
            });
            console.log('follow')
        }
    } else {
        return {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({ message: 'Signature is invalid' }),
        };
    }

    // Send Accept
    if (type === 'Follow') {
        console.log('send accept')
        const followeePrivateKey = await webcrypto.subtle.importKey(
            "jwk",
            blog.privateKey! as JsonWebKey,
            {
                name: "RSASSA-PKCS1-v1_5",
                hash: "SHA-256",
            }, true, ["sign"]
        );

        const body = JSON.stringify({
            '@context': 'https://www.w3.org/ns/activitystreams',
            type: 'Accept',
            actor: `${process.env.NEXT_PUBLIC_URL}/blog/${blog.slug}`,
            object: actor.id,
        });
        const digest = await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
        const base64Digest = Buffer.from(digest).toString('base64')

        const now = new Date();
        const newSignatureString = [
            '(request-target): post ' + new URL(actor.inbox).pathname,
            'host: ' + new URL(actor.inbox).host,
            'date: ' + now.toUTCString(),
            'digest: sha-256=' + Buffer.from(digest).toString('base64'),
        ].join('\n');
        console.log(2, newSignatureString);

        const newSignatureStringSignature = await webcrypto.subtle.sign(
            'RSASSA-PKCS1-v1_5',
            followeePrivateKey,
            Buffer.from(newSignatureString)
        )
        const hashBuffer_ = await webcrypto.subtle.digest("SHA-256", newSignatureStringSignature); // hash the message
        const newSignature_ = Buffer.from(hashBuffer_).toString('base64'); // base64 encode the hash
        console.log('newsignature_', newSignature_)
        console.log('body', newSignatureString);
        console.log(now.toUTCString());
        console.log(now);

        const r = await fetch(actor.inbox, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/activity+json',
                'Date': now.toUTCString(),
                'Digest': 'sha-256=' + base64Digest,
                'Signature': `keyId="${process.env.NEXT_PUBLIC_URL}/users/${blog.slug}#main-key",headers="(request-target) host date digest",signature="${newSignature_}"`,
            },
            body: body,
        });

        console.log(await r.json())

        return NextResponse.json({ message: 'Success' });
    }

    // return {
    //     status: 200,
    //     headers: {
    //         'content-type': 'application/json',
    //     },
    //     body: JSON.stringify({ message: 'Hello from the server!' }),
    // };
}
