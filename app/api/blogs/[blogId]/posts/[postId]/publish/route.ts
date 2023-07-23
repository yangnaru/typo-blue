import { prisma } from "@/lib/db";
import { decodePostId } from "@/lib/server-util";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, { params }: { params: { blogId: string, postId: string } }) {
    const json = await request.json();

    const publish = json.status === 'publish';

    const post = await prisma.post.findUnique({
        where: {
            uuid: decodePostId(params.postId),
        },
    });

    if (!post) {
        return NextResponse.json({ error: '글을 찾을 수 없습니다.' }, { status: 404 })
    }

    const updatedPost = await prisma.post.update({
        where: {
            id: post.id,
        },
        data: {
            publishedAt: publish ? new Date() : null,
        },
    });

    return NextResponse.json({
        message: publish ? '성공적으로 발행되었습니다.' : '성공적으로 발행 취소되었습니다.'
    });
}
