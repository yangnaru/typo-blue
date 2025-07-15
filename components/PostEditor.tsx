"use client";

import { useState } from "react";
import Tiptap from "./Tiptap";
import format from "date-fns/format";
import { deletePost, unPublishPost, upsertPost, sendPostEmail } from "@/lib/actions/blog";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { getBlogDashboardPath } from "@/lib/paths";
import { toast } from "sonner";

export default function PostEditor({
  blogId,
  existingPostId = null,
  existingTitle = "",
  existingContent = "",
  existingPublishedAt = null,
  existingEmailSent = false,
}: {
  blogId: string;
  existingPostId?: string | null;
  existingTitle?: string;
  existingContent?: string;
  existingPublishedAt?: Date | null;
  existingEmailSent?: boolean;
}) {
  const [postId, setPostId] = useState(existingPostId);
  const [title, setTitle] = useState(existingTitle);
  const [content, setContent] = useState(existingContent);
  const [publishedAt, setPublishedAt] = useState<Date | null>(
    existingPublishedAt
  );
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(existingEmailSent);
  const [isEmailLoading, setIsEmailLoading] = useState(false);

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
      toast(
        format(now, "yyyy년 MM월 dd일 HH시 mm분") +
          ` ${status === "save" ? "저장" : "발행"} 완료 ✅`
      );
      setIsLoading(false);
    } else {
      toast("❗️");
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (confirm("정말로 삭제하시겠습니까?")) {
      const res = await deletePost(blogId, existingPostId!);

      if (res.success) {
        alert("삭제되었습니다.");

        window.location.href = getBlogDashboardPath(blogId);
      }
    }
  }

  async function handleSendEmail() {
    if (!postId) {
      toast("글을 먼저 발행해야 합니다.");
      return;
    }

    setIsEmailLoading(true);
    
    try {
      const res = await sendPostEmail(blogId, postId);
      
      if (res.success) {
        setEmailSent(true);
        toast("이메일이 성공적으로 발송되었습니다! ✅");
      } else {
        toast(`이메일 발송 실패: ${res.message}`);
      }
    } catch (error) {
      toast("이메일 발송 중 오류가 발생했습니다.");
    } finally {
      setIsEmailLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{existingPostId ? "글 수정" : "새 글 작성"}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Input
          type="text"
          className="prose dark:prose-invert"
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {existingPostId && content && (
          <Tiptap
            name="content"
            content={content}
            className="prose dark:prose-invert min-h-[50vh] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            onChange={(_name, html) => {
              setContent(html);
            }}
          />
        )}
        {!existingPostId && (
          <Tiptap
            name="content"
            content={""}
            className="prose dark:prose-invert min-h-[50vh] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            onChange={(_name, html) => {
              setContent(html);
            }}
          />
        )}
      </CardContent>
      <CardFooter>
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
          {publishedAt !== null && (
            <Button
              variant="destructive"
              onClick={async () => {
                const res = await unPublishPost(blogId, postId!);

                if (res.success) {
                  setPublishedAt(null);
                  toast("발행 취소 완료 ✅");
                }
              }}
            >
              발행 취소
            </Button>
          )}
          {publishedAt !== null && postId !== null && (
            <Button
              variant="secondary"
              disabled={isEmailLoading || emailSent}
              onClick={handleSendEmail}
            >
              {emailSent ? "이메일 발송 완료" : "이메일 발송"}
            </Button>
          )}
          {postId !== null && (
            <Button variant="destructive" onClick={handleDelete}>
              삭제
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
