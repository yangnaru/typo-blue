import { connection } from "next/server";
import { db } from "@/lib/db";
import { blog } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getBlogHomePath, getRootPath } from "@/lib/paths";

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
        <div className="my-8 flex flex-row flex-wrap items-baseline break-keep">
          <h2 className="text-2xl font-bold mr-2">
            <Link href={getBlogHomePath(targetBlog.slug)}>
              {targetBlog.name || `@${targetBlog.slug}`}
            </Link>
          </h2>
          {targetBlog.description && (
            <p className="text-neutral-500">{targetBlog.description}</p>
          )}
        </div>
      )}
      {children}
      <footer className="py-8">
        <hr className="bg-neutral-500" />
        <div className="flex flex-row items-center justify-between text-sm font-semibold">
          <Link href={getRootPath()}>
            <span className="text-neutral-500">powered by</span> typo{" "}
            <span className="text-blue-500">blue</span>
          </Link>
          {targetBlog && (
            <p className="text-neutral-500">
              total {targetBlog.visitor_count}
            </p>
          )}
        </div>
      </footer>
    </>
  );
}
