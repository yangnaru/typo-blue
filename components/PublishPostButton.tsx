"use client";

import { publishPost, unPublishPost } from "@/lib/actions/blog";
import { Button } from "./ui/button";

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
    <Button variant="destructive" onClick={handlePublish}>
      {publishedAt ? "발행 취소" : "발행"}
    </Button>
  );
}
