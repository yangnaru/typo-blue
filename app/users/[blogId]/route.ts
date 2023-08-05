import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: { blogId: string }}) {
    if (request.headers.get("accept") !== "application/activity+json") {
        return NextResponse.redirect(`/@${params.blogId}`);
    }

    const url = process.env.NEXT_PUBLIC_URL;
    const blogId = params.blogId;

    const blog = await prisma.blog.findUnique({
        where: {
            slug: blogId
        }
    });

    if (!blog) {
        return NextResponse.redirect(`/`);
    }

    return NextResponse.json({
        "@context": [
            "https://www.w3.org/ns/activitystreams",
            "https://w3id.org/security/v1"
        ],
        "id": `${url}/users/${blogId}`,
        "type": "Person",
        "following": `${url}/users/${blogId}/following`,
        "followers": `${url}/users/${blogId}/followers`,
        "inbox": `${url}/users/${blogId}/inbox`,
        "outbox": `${url}/users/${blogId}/outbox`,
        "preferredUsername": blogId,
        "name": blogId,
        "summary": blog.description,
        "url": `${url}/@${blogId}`,
        "manuallyApprovesFollowers": false,
        "discoverable": false,
        "published": blog.createdAt,
        "endpoints": {
            "sharedInbox": `${url}/inbox`
        }
    })
}
