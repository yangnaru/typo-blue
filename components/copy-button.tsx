"use client";

import { toast } from "sonner";
import { PlainButton } from "@/components/plain-button";

// Copies `text` to the clipboard and says so.
export function CopyButton({ text }: { text: string }) {
  return (
    <PlainButton
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast("복사했습니다.");
        } catch {
          toast.error("복사하지 못했습니다. 직접 선택해 복사해 주세요.");
        }
      }}
    >
      복사
    </PlainButton>
  );
}
