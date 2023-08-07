import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { encode as base62encode, decode as base62decode } from "@urlpack/base62";
import crypto from "crypto";
import { NextRequest } from "next/server";

export async function getCurrentUser() {
    const session = await getServerSession(authOptions);

    return session?.user;
}

export function encodePostId(uuid: string) {
    return base62encode(Buffer.from(uuid.replaceAll('-', ''), 'hex'));
}

export function decodePostId(id: string) {
    return Buffer.from(base62decode(id)).toString('hex');
}

export function parseSignatureHeader(signatureHeader: string): Record<string, string> {
    return signatureHeader.split(',').reduce((acc, item) => {
        const [key, value] = item.split('=');
        return { ...acc, [key]: value.replaceAll('"', '') };
    }, {});
}

export async function verifyRequestSignature(request: NextRequest, actorPublicKey: string) {
    const _signatureHeader = request.headers.get('Signature');

    if (!_signatureHeader) {
        return {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({ message: 'Signature header is missing' }),
        };
    }

    const signatureHeader = parseSignatureHeader(_signatureHeader);
    const keyId = signatureHeader['keyId'];
    const headers = signatureHeader['headers'];
    const signature = signatureHeader['signature'];
    console.log('their sig', signature)

    const comparisonString = headers.split(' ').map((item) => {
        if (item === '(request-target)') {
            return `${item}: ${request.method.toLowerCase()} ${request.nextUrl.pathname}`;
        } else {
            return `${item}: ${request.headers.get(item)}`;
        }
    }).join('\n');

    const verify = crypto.createVerify('sha256');
    verify.update(comparisonString);
    verify.end();

    const verified = verify.verify(actorPublicKey, signature, 'base64');
    return verified;
}
