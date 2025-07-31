import { db } from "@/lib/db";
import { blog } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ReactNode } from "react";
import { notFound } from "next/navigation";

export default async function BlogLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ blogId: string }>;
}) {
  const blogId = decodeURIComponent((await params).blogId);
  if (!blogId.startsWith("@")) {
    notFound();
  }

  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogId.replace("@", "")),
  });

  return (
    <BlogLayoutBody blog={targetBlog}>
      {targetBlog && (
        <div className="my-8 flex flex-row flex-wrap items-baseline break-keep">
          {targetBlog && (
            <>
              <h2 className="text-2xl font-bold mr-2">
                <Link href={`/@${targetBlog.slug}`}>
                  {!targetBlog.name || targetBlog.name === ""
                    ? `@${targetBlog.slug}`
                    : targetBlog.name}
                </Link>
              </h2>

              {blog.description && (
                <p className="text-neutral-500">{targetBlog.description}</p>
              )}
            </>
          )}
        </div>
      )}
      {children}
    </BlogLayoutBody>
  );
}

function BlogLayoutBody({
  children,
  blog,
}: {
  children: ReactNode;
  blog?: any;
}) {
  return (
    <>
      {children}
      <h1 className="py-8 bottom-0">
        <hr className="bg-neutral-500" />
        <div className="flex flex-row items-center justify-between text-sm font-semibold">
          <Link href="/">
            <span className="text-neutral-500">powered by</span> typo{" "}
            <span className="text-blue-500">blue</span>
          </Link>
          {blog && (
            <p className="text-neutral-500">total {blog.visitor_count}</p>
          )}
        </div>
      </h1>
    </>
  );
}
