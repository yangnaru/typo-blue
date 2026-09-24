"use client";

import { PlainButton } from "@/components/plain-button";
import { toggleUserAdmin } from "@/lib/actions/admin";

export default function AdminToggleButton({
  userId,
  isAdmin,
  disabled,
}: {
  userId: string;
  isAdmin: boolean;
  disabled?: boolean;
}) {
  return (
    <PlainButton
      onClick={() => toggleUserAdmin(userId)}
      disabled={disabled}
      variant={isAdmin ? "destructive" : "default"}
    >
      {isAdmin ? "관리자 해제" : "관리자 지정"}
    </PlainButton>
  );
}
