import PostList from "@/components/PostList";
import { db } from "@/lib/db";
import { blog, postTable } from "@/drizzle/schema";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { incrementVisitorCount } from "@/lib/actions/blog";
import { notFound } from "next/navigation";

type Params = Promise<{
  blogId: string;
}>;

export default async function BlogHome(props: { params: Params }) {
  const blogId = decodeURIComponent((await props.params).blogId);
  if (!blogId.startsWith("@")) return <p>👀</p>;

  const slug = blogId.replace("@", "");
  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, slug),
    with: {
      user: true,
    },
  });

  if (!targetBlog) {
    notFound();
  }

  const publishedPosts = await db.query.postTable.findMany({
    where: and(
      eq(postTable.blogId, blog.id),
      eq(postTable.published, isNotNull(postTable.published))
    ),
    orderBy: desc(postTable.published),
    with: { blog: true },
  });

  await incrementVisitorCount(targetBlog.id);

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
