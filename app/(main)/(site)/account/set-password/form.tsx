"use client";

import { useActionState } from "react";

import { setPassword } from "@/lib/actions/account";
import { SubmitButton } from "./submit-button";
import { inputClassName } from "@/lib/form-styles";

const initialState = {
  message: "",
};

export default function SetPasswordForm({ email }: { email: string }) {
  const [state, formAction] = useActionState(setPassword, initialState);

  return (
    <div>
      <h3 className="text-lg">비밀번호 설정</h3>
      <form className="flex flex-col space-y-2" action={formAction}>
        <input type="hidden" name="email" value={email} />
        <input
          name="password"
          type="password"
          id="password"
          autoComplete="new-password"
          className={inputClassName}
          placeholder="비밀번호 (8자 이상)"
          required
        />
        <input
          name="password_confirm"
          type="password"
          id="password_confirm"
          autoComplete="new-password"
          className={inputClassName}
          placeholder="비밀번호 (한 번 더)"
          required
        />
        <SubmitButton />
        {state?.message && <p className="text-red-500">{state.message}</p>}
      </form>
    </div>
  );
}
