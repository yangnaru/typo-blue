import Logo from "@/components/Logo";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ReactNode } from "react";

export default async function BlogLayout({ children, params }: { children: ReactNode, params: { blogId: string } }) {
    const blogId = decodeURIComponent(params.blogId)
    if (!blogId.startsWith('@')) return <p>👀</p>

    const slug = blogId.replace('@', '');
    const blog = await prisma.blog.findUnique({
        where: {
            slug: slug
        },
        include: {
            posts: {
                orderBy: {
                    createdAt: 'desc'
                }
            }
        }
    });

    if (!blog) {
        return <p>블로그가 존재하지 않습니다.</p>
    }

    return <>
        <Logo />
        <h2 className="text-2xl my-4 font-bold">
            <Link href={`/@${blog.slug}`}>
                {blog.name ?? '@' + blog.slug}
            </Link>
        </h2>

        {children}
    </>
}
