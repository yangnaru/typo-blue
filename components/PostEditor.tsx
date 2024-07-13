"use client";

import { useState } from "react";
import Tiptap from "./Tiptap";
import format from "date-fns/format";
import { deletePost, upsertPost } from "@/lib/actions/blog";
import { Button } from "./ui/button";

export default function PostEditor({
  blogId,
  existingPostId = null,
  existingTitle = "",
  existingContent = "",
  existingPublishedAt = null,
}: {
  blogId: string;
  existingPostId?: string | null;
  existingTitle?: string;
  existingContent?: string;
  existingPublishedAt?: Date | null;
}) {
  const [postId, setPostId] = useState(existingPostId);
  const [title, setTitle] = useState(existingTitle);
  const [content, setContent] = useState(existingContent);
  const [publishedAt, setPublishedAt] = useState<Date | null>(
    existingPublishedAt
  );

  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSavePost(status: "save" | "publish" = "save") {
    setIsLoading(true);

    const publishedAt = status === "publish" ? new Date() : null;
    const res = await upsertPost(blogId, publishedAt, postId, title, content);

    if (res.success) {
      setPostId(res.postId);

      if (publishedAt) {
        setPublishedAt(publishedAt);
      }

      const now = new Date();
      setStatus(
        format(now, "yyyy년 MM월 dd일 HH시 mm분") +
          ` ${status === "save" ? "저장" : "발행"} 완료 ✅`
      );
      setIsLoading(false);

      if (status === "publish" || (status === "save" && existingPostId)) {
        window.location.href = `/@${blogId}/${res.postId}`;
      }
    } else {
      setStatus("❗️");
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (confirm("정말로 삭제하시겠습니까?")) {
      const res = await deletePost(blogId, existingPostId!);

      if (res.success) {
        window.location.href = `/@${blogId}`;
      } else {
        alert("삭제에 실패했습니다.");
      }
    }
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        className="border border-black p-2 min-w-full dark:bg-black dark:border-white rounded-sm"
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      {existingPostId && content && (
        <Tiptap
          name="content"
          content={content}
          className="p-2 prose dark:prose-invert border border-black rounded-sm dark:border-white min-h-[50vh]"
          onChange={(_name, html) => {
            setContent(html);
          }}
        />
      )}
      {!existingPostId && (
        <Tiptap
          name="content"
          content={""}
          className="p-2 prose dark:prose-invert border border-black rounded-sm dark:border-white min-h-[50vh]"
          onChange={(_name, html) => {
            setContent(html);
          }}
        />
      )}

      <div className="flex flex-row space-x-2 items-baseline">
        <Button disabled={isLoading} onClick={() => handleSavePost("save")}>
          저장
        </Button>
        {publishedAt === null && (
          <Button
            disabled={isLoading}
            onClick={() => handleSavePost("publish")}
          >
            발행
          </Button>
        )}
        {postId !== null && (
          <Button variant="destructive" onClick={handleDelete}>
            삭제
          </Button>
        )}
        <p>{status}</p>
      </div>
    </div>
  );
}
