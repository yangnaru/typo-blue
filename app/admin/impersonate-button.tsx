"use client";

import { Button } from "@/components/ui/button";
import { impersonateUser } from "@/lib/actions/admin";

export default function ImpersonateButton({ userId }: { userId: number }) {
  return <Button onClick={() => impersonateUser(userId)}>흉내내기</Button>;
}
