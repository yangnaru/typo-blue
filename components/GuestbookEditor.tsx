"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import GuestbookTiptap from "./GuestbookTiptap";
import { User } from "lucia";
import { Button } from "./ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" aria-disabled={pending}>
      방명록 남기기
    </Button>
  );
}

export default function GuestbookEditor({ user }: { user: User }) {
  const [content, setContent] = useState("");

  return (
    <div className="space-y-2">
      <input type="hidden" name="content" value={content} />
      <GuestbookTiptap
        name="content"
        content={""}
        className="p-2 prose dark:prose-invert border border-blue-500 rounded-sm dark:border-white"
        onChange={(_name, html) => {
          setContent(html);
        }}
      />

      <p className="text-sm">
        블로그 주인장에게는 자신의 이메일이 공개됩니다.{" "}
        <span>({user.email})</span>
      </p>

      <div className="flex flex-row space-x-2 items-baseline">
        <SubmitButton />
      </div>
    </div>
  );
}
