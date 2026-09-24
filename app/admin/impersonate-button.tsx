"use client";

import { PlainButton } from "@/components/plain-button";
import { impersonateUser } from "@/lib/actions/admin";

export default function ImpersonateButton({ userId }: { userId: string }) {
  return (
    <PlainButton onClick={() => impersonateUser(userId)}>흉내내기</PlainButton>
  );
}
