"use client";

import { encodePostId } from "@/lib/utils";
import { Blog, Guestbook, User } from "@prisma/client";
import Link from "next/link";
import GuestbookTiptap from "./GuestbookTiptap";
import { useState } from "react";
import { deleteGuestbook, saveGuestbookReply } from "@/lib/actions/blog";
import { useFormStatus } from "react-dom";
import { User as LuciaUser } from "lucia";
import { Button } from "./ui/button";
import { toast } from "sonner";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" aria-disabled={pending}>
      답글 남기기
    </Button>
  );
}

export default function GuestbookDetail({
  currentUser,
  guestbook,
  blog,
  isReplyable,
}: {
  currentUser: LuciaUser | null;
  guestbook: Guestbook & { author: User };
  blog: Blog;
  isReplyable: boolean;
}) {
  const [content, setContent] = useState("");

  const base62 = encodePostId(guestbook.uuid);

  function handleDeleteGuestbook() {
    if (confirm("정말 방명록을 삭제하시겠습니까?")) {
      deleteGuestbook(guestbook.uuid).then((data) => {
        if (data && data.error) {
          toast(`방명록 삭제에 실패했습니다: ${data.error}`);
        }
      });
    }
  }

  return (
    <div className="p-2 border border-black rounded-sm space-y-4">
      <div className="flex flex-row justify-between">
        <div>
          {blog.userId === currentUser?.id && <p>{guestbook.author.email}</p>}
          <Link
            href={`/@${blog.slug}/guestbook/${base62}`}
            className="italic text-blue-500"
          >
            {guestbook.createdAt.toLocaleString()} 작성
          </Link>
        </div>
        {((currentUser?.id === guestbook.authorId && !guestbook.repliedAt) ||
          isReplyable) && (
          <div>
            <Button variant="destructive" onClick={handleDeleteGuestbook}>
              방명록 삭제
            </Button>
          </div>
        )}
      </div>

      <div
        className="prose dark:prose-invert break-keep"
        dangerouslySetInnerHTML={{ __html: guestbook.content }}
      />

      {guestbook.reply && (
        <div className="p-2 prose dar:prose-invert border border-blue-500 rounded-sm dark:border-white">
          {guestbook.repliedAt && (
            <span className="italic">
              {guestbook.repliedAt?.toLocaleString()} 답변 작성
            </span>
          )}
          <div
            className="prose dark:prose-invert break-keep"
            dangerouslySetInnerHTML={{ __html: guestbook.reply }}
          />
        </div>
      )}

      {isReplyable && !guestbook.repliedAt && (
        <form action={saveGuestbookReply} className="space-y-2">
          <input type="hidden" name="guestbookId" value={guestbook.uuid} />
          <input type="hidden" name="content" value={content} />
          <GuestbookTiptap
            name="content"
            className="p-2 prose dark:prose-invert border border-blue-500 rounded-sm dark:border-white"
            content=""
            onChange={(_, html) => {
              setContent(html);
            }}
          />
          <SubmitButton />
        </form>
      )}
    </div>
  );
}
