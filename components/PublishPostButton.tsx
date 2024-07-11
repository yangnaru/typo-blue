"use client";

import { publishPost, unPublishPost } from "@/lib/actions/blog";

export default function PublishPostButton({
  slug,
  postId,
  publishedAt,
}: {
  slug: string;
  postId: string;
  publishedAt: Date | null;
}) {
  async function handlePublish() {
    if (publishedAt === null) {
      await publishPost(slug, postId);
    } else {
      await unPublishPost(slug, postId);
    }
    window.location.reload();
  }

  return (
    <button
      onClick={handlePublish}
      className="border rounded-sm p-1 border-red-500 hover:text-black hover:bg-red-300"
    >
      {publishedAt ? "발행 취소" : "발행"}
    </button>
  );
}
