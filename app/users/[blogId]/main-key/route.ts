import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: { blogId: string } }) {
    console.log('handing out public key')

    const blogSlug = params.blogId.replace('@', '');
    const blog = await prisma.blog.findUnique({
        where: {
            slug: blogSlug,
        },
    });

    if (!blog) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    console.log("giving out jsonwebkey")
    const body = {
        "@context": [
            "https://www.w3.org/ns/activitystreams",
            "https://w3id.org/security/v1"
        ],
        id: `${process.env.NEXT_PUBLIC_URL}/users/${blog.slug}`,
        inbox: `${process.env.NEXT_PUBLIC_URL}/users/${blog.slug}/inbox`,
        outbox: `${process.env.NEXT_PUBLIC_URL}/users/${blog.slug}/outbox`,
        name: blog.slug,
        preferredUsername: blog.slug,
        publicKey: {
            id: `${process.env.NEXT_PUBLIC_URL}/users/${blog.slug}/main-key`,
            owner: `${process.env.NEXT_PUBLIC_URL}/users/${blog.slug}`,
            publicKeyPem: blog.publicKey,
        },
        url: `${process.env.NEXT_PUBLIC_URL}/@${blog.slug}`,
    }
    console.log('jsonwebkey', body)

    return NextResponse.json(body, {
        headers: {
            'Content-Type': 'application/activity+json',
        },
    });

}
