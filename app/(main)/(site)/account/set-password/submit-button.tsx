"use client";

import { PlainButton } from "@/components/plain-button";
import { useFormStatus } from "react-dom";

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <PlainButton type="submit" disabled={pending}>
      비밀번호 설정
    </PlainButton>
  );
}
