"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="border border-blue-500 p-1 rounded-sm hover:bg-blue-300 hover:text-black"
      type="submit"
      disabled={pending}
    >
      비밀번호 설정
    </button>
  );
}
