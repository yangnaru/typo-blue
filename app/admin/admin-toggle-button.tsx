"use client";

import { Button } from "@/components/ui/button";
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
    <Button
      onClick={() => toggleUserAdmin(userId)}
      disabled={disabled}
      variant={isAdmin ? "destructive" : "default"}
      size="sm"
    >
      {isAdmin ? "관리자 해제" : "관리자 지정"}
    </Button>
  );
}
