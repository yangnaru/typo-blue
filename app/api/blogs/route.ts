import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/server-util";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    const currentUser = await getCurrentUser();

    if (!currentUser?.email) {
        return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const blogs = await prisma.blog.findMany({
        where: {
            user: {
                email: currentUser.email,
            }
        },
        include: {
            posts: {
                select: {
                    id: true,
                }
            },
        }
    });

    const user = await prisma.user.findUnique({
        where: {
            email: currentUser.email,
        },
    });

    if (!user) {
        return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
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
            }
        }),
        user: {
            email: user.email,
            createdAt: user.createdAt,
        }
    });
}

export async function POST(request: NextRequest) {
    const currentUser = await getCurrentUser();

    if (!currentUser?.email) {
        return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const blogs = await prisma.blog.findMany({
        where: {
            user: {
                email: currentUser.email,
            }
        },
    });

    if (blogs.length >= 3) {
        return NextResponse.json({ error: '블로그는 최대 3개까지 만들 수 있습니다.' }, { status: 400 });
    }

    const json = await request.json();
    const blogId: string = json.blogId;
    const regex = /^[0-9a-zA-Z(\_)]+$/;

    if (!(0 < blogId.length && blogId.length < 20) || !regex.test(blogId)) {
        return NextResponse.json({ error: '블로그 ID는 1자 이상 20자 이하의 영문, 숫자, 밑줄만 사용할 수 있습니다.' }, { status: 400 });
    }

    const existingBlog = await prisma.blog.findFirst({
        where: {
            slug: {
                equals: blogId,
                mode: 'insensitive',
            },
        }
    });

    if (existingBlog) {
        return NextResponse.json({ error: '이미 존재하는 블로그 ID입니다.' }, { status: 400 });
    }

    try {
        const q = await prisma.blog.create({
            data: {
                slug: json.blogId,
                user: {
                    connect: {
                        email: currentUser.email,
                    }
                }
            }
        });
    
        return NextResponse.json(q);
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
            if (e.code === 'P2002') {
                return NextResponse.json({ error: '이미 존재하는 블로그 ID입니다.' }, { status: 400 });
            }
        }
        return NextResponse.json({ error: '알 수 없는 오류가 발생했습니다.' }, { status: 500 });
    }
}
