import PostList from "@/components/PostList";
import { db } from "@/lib/db";
import { blog, post } from "@/lib/schema";
import { and, desc, eq, isNotNull } from "drizzle-orm";

export default async function BlogHome({
  params,
}: {
  params: { blogId: string };
}) {
  const blogId = decodeURIComponent(params.blogId);
  if (!blogId.startsWith("@")) return <p>👀</p>;

  const slug = blogId.replace("@", "");
  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, slug),
    with: {
      user: true,
    },
  });

  if (!targetBlog) {
    return <p>블로그가 존재하지 않습니다.</p>;
  }

  const publishedPosts = await db.query.post.findMany({
    where: and(
      eq(post.blogId, blog.id),
      eq(post.publishedAt, isNotNull(post.publishedAt))
    ),
    orderBy: desc(post.publishedAt),
    with: { blog: true },
  });

  return (
    <PostList
      name="발행된 글 목록"
      blog={blog}
      posts={publishedPosts}
      showTitle={false}
      embed={true}
    />
  );
}
