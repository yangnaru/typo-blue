import PostEditor from "@/components/PostEditor";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRootPath } from "@/lib/paths";
import { blog } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function BlogNewPostPage({
  params,
}: {
  params: { blogId: string };
}) {
  const { user } = await getCurrentSession();

  const blogId = decodeURIComponent(params.blogId).replace("@", "");
  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogId),
  });

  if (user?.id !== targetBlog?.userId) {
    redirect(getRootPath());
  }

  return <PostEditor blogId={blogId} />;
}
