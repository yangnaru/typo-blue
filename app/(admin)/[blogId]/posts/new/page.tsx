import PostEditor from "@/components/PostEditor";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRootPath } from "@/lib/paths";
import { blog } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

type Params = Promise<{ blogId: string }>;

export default async function BlogNewPostPage(props: { params: Params }) {
  const { user } = await getCurrentSession();

  const blogId = decodeURIComponent((await props.params).blogId).replace(
    "@",
    ""
  );
  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogId),
  });

  if (user?.id !== targetBlog?.userId) {
    redirect(getRootPath());
  }

  return <PostEditor blogId={blogId} />;
}
