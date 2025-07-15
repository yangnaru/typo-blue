import PostEditor from "@/components/PostEditor";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRootPath } from "@/lib/paths";
import { blog, post, postEmailSent } from "@/drizzle/schema";
import { decodePostId } from "@/lib/utils";
import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";

type Params = Promise<{ blogId: string; postId: string }>;

export default async function EditPost(props: { params: Params }) {
  const uuid = decodePostId((await props.params).postId);
  const slug = decodeURIComponent((await props.params).blogId).replace("@", "");

  const { user } = await getCurrentSession();
  if (!user) {
    redirect(getRootPath());
  }

  const editingPost = await db.query.post.findFirst({
    where: and(eq(post.id, uuid), isNull(post.deleted)),
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

  const emailSentRecord = await db.query.postEmailSent.findFirst({
    where: eq(postEmailSent.postId, uuid),
  });

  const emailSent = !!emailSentRecord;

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
