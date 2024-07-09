import { prisma } from "@/lib/db";
import { encodePostId } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import sanitize from "sanitize-html";

export async function POST(
  request: NextRequest,
  { params }: { params: { blogId: string } }
) {
  const slug = decodeURIComponent(params.blogId).replace("@", "");
  const json = await request.json();

  const post = await prisma.$transaction(async (tx) => {
    const blog = await tx.blog.findUnique({
      where: {
        slug: slug,
      },
    });

    const publishedAt = json.status === "publish" ? new Date() : undefined;
    const post = await tx.post.create({
      data: {
        blog: {
          connect: {
            id: blog?.id,
          },
        },
        title: json.title,
        content: sanitize(json.content),
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: publishedAt,
      },
    });

    return post;
  });

  return NextResponse.json({
    postId: encodePostId(post.uuid),
    title: post.title,
    content: post.content,
    status: post.publishedAt ? "publish" : "draft",
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  });
}
