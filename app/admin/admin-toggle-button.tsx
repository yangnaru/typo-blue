"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { PlainButton } from "@/components/plain-button";
import { setUserAdmin } from "@/lib/actions/admin";

export default function AdminToggleButton({
  userId,
  isAdmin,
  disabled,
}: {
  userId: string;
  isAdmin: boolean;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <PlainButton
      onClick={() =>
        startTransition(async () => {
          try {
            await setUserAdmin(userId, !isAdmin);
          } catch {
            toast.error("관리자 권한을 바꾸지 못했습니다.");
          }
        })
      }
      disabled={disabled || isPending}
      variant={isAdmin ? "destructive" : "default"}
    >
      {isAdmin ? "관리자 해제" : "관리자 지정"}
    </PlainButton>
  );
}
