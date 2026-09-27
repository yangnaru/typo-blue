import { connection } from "next/server";
import { db } from "@/lib/db";
import { blog } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getBlogHomePath } from "@/lib/paths";
import BlogFooter from "@/components/blog-footer";
import { BlogSubscribeButton } from "@/components/blog-subscribe-button";

type BlogLayoutProps = {
  children: ReactNode;
  params: Promise<{ blogId: string }>;
};

export default async function BlogLayout({
  children,
  params,
}: BlogLayoutProps) {
  await connection();

  const blogId = decodeURIComponent((await params).blogId);
  if (!blogId.startsWith("@")) {
    notFound();
  }

  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogId.replace("@", "")),
  });

  return (
    <>
      {targetBlog && (
        <div className="my-8 flex flex-row items-baseline justify-between gap-3">
          <div className="flex flex-row flex-wrap items-baseline break-keep min-w-0">
            <h2 className="text-2xl font-bold mr-2">
              <Link href={getBlogHomePath(targetBlog.slug)}>
                {targetBlog.name || `@${targetBlog.slug}`}
              </Link>
            </h2>
            {targetBlog.description && (
              <p className="text-neutral-500">{targetBlog.description}</p>
            )}
          </div>
          <BlogSubscribeButton slug={targetBlog.slug} />
        </div>
      )}
      {children}
      <BlogFooter blog={targetBlog ?? null} />
    </>
  );
}
