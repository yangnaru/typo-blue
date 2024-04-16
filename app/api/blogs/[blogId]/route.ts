import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { blogId: string } }
) {
  const blog = await prisma.blog.findUnique({
    where: {
      slug: decodeURIComponent(params.blogId).replace("@", ""),
    },
    include: {
      user: true,
      posts: true,
    },
  });

  if (!blog) {
    return NextResponse.json(
      { error: "블로그를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    slug: blog.slug,
    name: blog.name,
    description: blog.description,
    postCount: blog.posts.length,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { blogId: string } }
) {
  const { user } = await validateRequest();

  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const blog = await prisma.blog.findUnique({
    where: {
      slug: params.blogId,
    },
    include: {
      user: true,
    },
  });

  if (!blog) {
    return NextResponse.json(
      { error: "블로그를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (blog.user.email !== user.email) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  await prisma.blog.delete({
    where: {
      slug: params.blogId,
    },
  });

  return NextResponse.json({ status: "success" });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { blogId: string } }
) {
  const { user } = await validateRequest();

  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const slug = decodeURIComponent(params.blogId).replace("@", "");
  const blog = await prisma.blog.findUnique({
    where: {
      slug: slug,
    },
    include: {
      user: true,
    },
  });

  if (!blog) {
    return NextResponse.json(
      { error: "블로그를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (blog.user.email !== user.email) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const json = await request.json();

  const existingBlog = await prisma.blog.findFirst({
    where: {
      slug: {
        equals: json.slug,
        mode: "insensitive",
      },
    },
  });

  if (existingBlog && existingBlog.slug !== slug) {
    return NextResponse.json(
      { error: "이미 사용중인 블로그 주소입니다." },
      { status: 400 }
    );
  }

  try {
    const newBlog = await prisma.blog.update({
      where: {
        slug: slug,
      },
      data: {
        slug: json.slug,
        name: json.name,
        description: json.description,
      },
    });

    return NextResponse.json({
      slug: newBlog.slug,
      name: newBlog.name,
      description: newBlog.description,
      message: "블로그 정보가 변경되었습니다.",
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "이미 사용중인 블로그 주소입니다." },
        { status: 400 }
      );
    }

    throw e;
  }
}
