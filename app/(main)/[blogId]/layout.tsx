import { db } from "@/lib/db";
import { blog } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";

type BlogLayoutProps = {
  children: ReactNode;
  params: Promise<{ blogId: string }>;
};

export default async function BlogLayout({
  children,
  params,
}: BlogLayoutProps) {
  const { user } = await getCurrentSession();

  let blogs;
  if (user) {
    blogs = await db.query.blog.findMany({
      where: eq(blog.userId, user.id),
    });
  }

  const blogId = decodeURIComponent((await params).blogId);
  if (!blogId.startsWith("@")) {
    notFound();
  }

  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogId.replace("@", "")),
  });

  return (
    <>{children}</>
  );
}
