import PostEditor from "@/components/PostEditor";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRootPath } from "@/lib/paths";
import { blog, post } from "@/lib/schema";
import { decodePostId } from "@/lib/utils";
import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function EditPost({
  params,
}: {
  params: { blogId: string; postId: string };
}) {
  const uuid = decodePostId(params.postId);
  const slug = decodeURIComponent(params.blogId).replace("@", "");

  const { user } = await getCurrentSession();
  if (!user) {
    redirect(getRootPath());
  }

  const editingPost = await db.query.post.findFirst({
    where: and(
      eq(post.uuid, uuid),
      isNull(post.deletedAt),
      eq(blog.slug, slug),
      eq(blog.userId, user.id)
    ),
    with: {
      blog: true,
    },
  });

  if (editingPost?.blog.userId !== user.id) {
    redirect(getRootPath());
  }

  if (!post) {
    redirect(getRootPath());
  }

  return (
    <PostEditor
      blogId={slug}
      existingTitle={editingPost.title ?? ""}
      existingContent={editingPost.content ?? ""}
      existingPostId={params.postId}
      existingPublishedAt={editingPost.publishedAt}
    />
  );
}
