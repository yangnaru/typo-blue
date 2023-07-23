import LogoFooter from "@/components/LogoFooter";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ReactNode } from "react";

export default async function BlogLayout({ children, params }: { children: ReactNode, params: { blogId: string } }) {
    const blogId = decodeURIComponent(params.blogId)
    if (!blogId.startsWith('@')) {
        return <BlogLayoutBody>👀</BlogLayoutBody>
    }

    const blog = await prisma.blog.findUnique({
        where: {
            slug: blogId.replace('@', '')
        },
        include: {
            posts: {
                orderBy: {
                    createdAt: 'desc'
                }
            }
        }
    });

    return <BlogLayoutBody>
        {blog &&
            <div className="my-8 flex flex-row items-baseline space-x-2">
                {blog && <>
                    <h2 className="text-2xl font-bold">
                        <Link href={`/@${blog.slug}`}>
                            {(!blog.name || blog.name === '') ? `@${blog.slug}` : blog.name}
                        </Link>
                    </h2>

                    {blog.description && <p className="text-neutral-500">{blog.description}</p>}
                </>}
            </div>}
            
        {children}
    </BlogLayoutBody>
}

function BlogLayoutBody({ children }: { children: ReactNode }) {
    return <>
        {children}
        <LogoFooter />
    </>
}
