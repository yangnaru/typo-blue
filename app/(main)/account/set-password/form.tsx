"use client";

import { useActionState } from "react";

import { setPassword } from "@/lib/actions/account";
import { SubmitButton } from "./submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState = {
  message: "",
};

export default function SetPasswordForm({ email }: { email: string }) {
  const [state, formAction] = useActionState(setPassword, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>새 비밀번호 설정</CardTitle>
        <CardDescription>
          안전한 비밀번호를 설정해주세요. 8자 이상의 비밀번호를 사용하세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" action={formAction}>
          <input type="hidden" name="email" value={email} />

          <div className="space-y-2">
            <Label htmlFor="password">새 비밀번호</Label>
            <Input
              name="password"
              type="password"
              id="password"
              autoComplete="new-password"
              placeholder="새 비밀번호를 입력해주세요"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password_confirm">비밀번호 확인</Label>
            <Input
              name="password_confirm"
              type="password"
              id="password_confirm"
              autoComplete="new-password"
              placeholder="비밀번호를 다시 입력해주세요"
              required
            />
          </div>

          <SubmitButton />

          {state?.message && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {state.message}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
