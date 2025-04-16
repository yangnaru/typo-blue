import BlogEditForm from "@/components/BlogEditForm";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { blog } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export default async function EditBlogPage({
  params,
}: {
  params: { blogId: string };
}) {
  const { user } = await getCurrentSession();
  if (!user) {
    return <p>로그인이 필요합니다.</p>;
  }

  const blogSlug = decodeURIComponent(params.blogId).replace("@", "");
  const targetBlog = await db.query.blog.findFirst({
    where: and(eq(blog.slug, blogSlug), eq(blog.userId, user.id)),
  });
  if (!targetBlog) {
    return <p>블로그를 찾을 수 없습니다.</p>;
  }

  // Fetch posts count
  const posts = await db.query.post.findMany({
    where: eq(blog.id, targetBlog.id),
  });
  const postsCount = posts.length;

  return (
    <BlogEditForm
      slug={targetBlog.slug}
      name={targetBlog.name ?? ""}
      description={targetBlog.description ?? ""}
      discoverable={targetBlog.discoverable}
      postCount={postsCount}
    />
  );
}
