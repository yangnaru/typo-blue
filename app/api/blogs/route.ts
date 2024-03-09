import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { user: currentUser } = await validateRequest();

  if (!currentUser?.email) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const blogs = await prisma.blog.findMany({
    where: {
      user: {
        email: currentUser.email,
      },
    },
    include: {
      posts: {
        select: {
          id: true,
        },
      },
    },
  });

  const user = await prisma.user.findUnique({
    where: {
      email: currentUser.email,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "사용자를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    blogs: blogs.map((blog) => {
      return {
        id: blog.id,
        slug: blog.slug,
        name: blog.name,
        createdAt: blog.createdAt,
        updatedAt: blog.updatedAt,
        postCount: blog.posts.length,
      };
    }),
    user: {
      email: user.email,
      createdAt: user.createdAt,
    },
  });
}
