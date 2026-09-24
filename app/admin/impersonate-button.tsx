"use client";

import { useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";
import { PlainButton } from "@/components/plain-button";
import { impersonateUser } from "@/lib/actions/admin";

export default function ImpersonateButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <PlainButton
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await impersonateUser(userId);
          } catch (error) {
            // redirect() on success surfaces as an error; let Next handle it
            unstable_rethrow(error);
            toast.error("흉내내기에 실패했습니다.");
          }
        })
      }
    >
      흉내내기
    </PlainButton>
  );
}
