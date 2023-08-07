import { prisma } from "@/lib/db";
import { parseSignatureHeader, verifyRequestSignature } from "@/lib/server-util";
import crypto, { KeyLike, createSign, getHashes, webcrypto } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: { blogId: string } }) {
    console.log('user inbox');
    const { type, object } = await request.json();

    const keyId = parseSignatureHeader(request.headers.get('Signature')!).keyId;
    const actor = await (await fetch(keyId, {
        headers: {
            'Accept': 'application/activity+json',
        },
    })).json();
    const actorPublicKey = actor.publicKey.publicKeyPem;
    const verified = await verifyRequestSignature(request, actorPublicKey);
    console.log('verified', verified)

    if (!verified) {
        return NextResponse.json({ message: 'Signature verification failed' }, { status: 400 });
    }

    if (type === 'Follow') {
        console.log('follow: ', object)

        const blog = await prisma.blog.findUnique({
            where: {
                slug: params.blogId,
            },
        });

        if (!blog) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        console.log(blog.slug)

        const entity = {
            '@context': 'https://www.w3.org/ns/activitystreams',
            type: 'Accept',
            actor: `${process.env.NEXT_PUBLIC_URL}/blog/${blog.slug}`,
            object: actor.id,
        };
        const digest = await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(entity)));
        const base64Digest = Buffer.from(digest).toString('base64')

        const now = new Date();
        const foreignPathName = new URL(actor.inbox).pathname;
        const foreignDomain = new URL(actor.inbox).host;
        const dateString = now.toUTCString();

        const digestHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(entity))
            .digest('base64');
        const digestHeader = `SHA-256=${digestHash}`;
        const stringToSign = `(request-target): post ${foreignPathName}\nhost: ${foreignDomain}\ndate: ${dateString}\ndigest: SHA-256=${digestHash}`;
        const signature = await sign(stringToSign, blog.privateKey!);
        console.log('follor: ', signature);

        const r = await fetch(actor.inbox, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/activity+json',
                'Date': dateString,
                'Digest': digestHeader,
                'Signature': `keyId="${process.env.NEXT_PUBLIC_URL}/users/${blog.slug}/main-key",algorithm="rsa-sha256",headers="(request-target) host date digest",signature="${signature}"`,
            },
            body: JSON.stringify(entity),
        });
        console.log('follow: ', await r.json())

        return NextResponse.json({ message: 'Success' });
    } else if (type === 'Undo' && object.type === 'Follow') {
        console.log('undo follow', object)
    }

    return NextResponse.json({ message: 'ok' });
}

async function sign(stringToBeSigned: string, pem: string) {
    // fetch the part of the PEM string between header and footer
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = pem.substring(
        pemHeader.length,
        pem.length - pemFooter.length,
    ).replaceAll('\n', '');


    const pk = await webcrypto.subtle.importKey('pkcs8', Buffer.from(pemContents, 'base64'), {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
    }, true, ['sign']);
    console.log('sign: ', pk)

    const signature = await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', pk, Buffer.from(stringToBeSigned));
    console.log('sign: signature: ', signature)
    return Buffer.from(signature).toString('base64');
}
