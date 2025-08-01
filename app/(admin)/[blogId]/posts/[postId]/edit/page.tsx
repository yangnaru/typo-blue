import PostEditor from "@/components/PostEditor";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRootPath } from "@/lib/paths";
import { blog, postTable } from "@/drizzle/schema";
import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";

type Params = Promise<{ blogId: string; postId: string }>;

export default async function EditPost(props: { params: Params }) {
  const uuid = (await props.params).postId;
  const slug = decodeURIComponent((await props.params).blogId).replace("@", "");

  const { user } = await getCurrentSession();
  if (!user) {
    redirect(getRootPath());
  }

  const editingPost = await db.query.postTable.findFirst({
    where: and(eq(postTable.id, uuid), isNull(postTable.deleted)),
  });

  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, slug),
  });

  if (targetBlog?.userId !== user.id) {
    redirect(getRootPath());
  }

  if (!editingPost) {
    redirect(getRootPath());
  }

  const emailSent = !!editingPost.emailSent;

  return (
    <PostEditor
      blogId={slug}
      existingTitle={editingPost.title ?? ""}
      existingContent={editingPost.content ?? ""}
      existingPostId={(await props.params).postId}
      existingPublishedAt={editingPost.published}
      existingEmailSent={emailSent}
    />
  );
}
