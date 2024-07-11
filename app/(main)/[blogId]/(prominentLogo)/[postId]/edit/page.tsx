import PostEditor from "@/components/PostEditor";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRootPath } from "@/lib/paths";
import { decodePostId } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function EditPost({
  params,
}: {
  params: { blogId: string; postId: string };
}) {
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
  });
  if (!post) {
    redirect(getRootPath());
  }

  return (
    <div className="space-y-2">
      <h2 className="text-xl">글 수정</h2>

      <PostEditor
        blogId={slug}
        existingTitle={post.title ?? ""}
        existingContent={post.content ?? ""}
        existingPostId={params.postId}
        existingPublishedAt={post.publishedAt}
      />
    </div>
  );
}
