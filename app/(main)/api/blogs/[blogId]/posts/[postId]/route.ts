import { prisma } from "@/lib/db";
import { decodePostId, encodePostId } from "@/lib/server-util";
import { NextRequest, NextResponse } from "next/server";
import sanitize from "sanitize-html";

export async function GET(
  request: NextRequest,
  { params }: { params: { blogId: string; postId: string } }
) {
  const post = await prisma.post.findUnique({
    where: {
      uuid: decodePostId(params.postId),
    },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json({
    postId: encodePostId(post.uuid),
    title: post.title,
    content: post.content,
    status: post.publishedAt ? "publish" : "draft",
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    publishedAt: post.publishedAt,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { blogId: string; postId: string } }
) {
  const json = await request.json();
  const uuid = decodePostId(params.postId);

  const post = await prisma.post.findUnique({
    where: {
      uuid,
    },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const updatedPost = await prisma.post.update({
    where: {
      uuid,
    },
    data: {
      title: json.title ?? "",
      content: sanitize(json.content),
      updatedAt: new Date(),
      publishedAt: json.status === "publish" ? new Date() : undefined,
    },
  });

  return NextResponse.json({
    postId: encodePostId(updatedPost.uuid),
    title: updatedPost.title,
    content: updatedPost.content,
    status: updatedPost.publishedAt ? "publish" : "draft",
    createdAt: updatedPost.createdAt,
    updatedAt: updatedPost.updatedAt,
    publishedAt: updatedPost.publishedAt,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { blogId: string; postId: string } }
) {
  const uuid = decodePostId(params.postId);

  const post = await prisma.post.findUnique({
    where: {
      uuid: decodePostId(params.postId),
    },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  await prisma.post.update({
    where: {
      uuid,
    },
    data: {
      title: null,
      content: null,
      deletedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
