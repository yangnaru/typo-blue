import PostEditor from "@/components/PostEditor";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRootPath } from "@/lib/paths";
import { decodePostId } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function EditPost(
  props: {
    params: Promise<{ blogId: string; postId: string }>;
  }
) {
  const params = await props.params;
  const uuid = decodePostId(params.postId);
  const slug = decodeURIComponent(params.blogId).replace("@", "");

  const { user } = await validateRequest();
  if (!user) {
    redirect(getRootPath());
  }

  const post = await prisma.post.findUnique({
    where: {
      uuid,
      deletedAt: null,
      blog: {
        slug,
        userId: user.id,
      },
    },
    include: {
      blog: true,
    },
  });

  if (post?.blog.userId !== user.id) {
    redirect(getRootPath());
  }

  if (!post) {
    redirect(getRootPath());
  }

  return (
    <PostEditor
      blogId={slug}
      existingTitle={post.title ?? ""}
      existingContent={post.content ?? ""}
      existingPostId={params.postId}
      existingPublishedAt={post.publishedAt}
    />
  );
}
