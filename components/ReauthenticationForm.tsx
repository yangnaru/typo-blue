"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  reauthenticateWithCode,
  reauthenticateWithPassword,
  sendReauthenticationCode,
} from "@/lib/actions/account";
import { inputClassName, submitClassName } from "@/lib/form-styles";

// Asks the user to prove who they are again, by their password or a code
// sent to their email, before a sensitive change
export default function ReauthenticationForm({
  email,
  hasPassword,
}: {
  email: string;
  hasPassword: boolean;
}) {
  const router = useRouter();
  const [usingPassword, setUsingPassword] = useState(hasPassword);
  const [password, setPassword] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function run(task: () => Promise<boolean>, failure: string) {
    setIsLoading(true);
    try {
      if (await task()) {
        router.refresh();
        return;
      }
      toast.error(failure);
    } catch {
      toast.error(failure);
    }
    setIsLoading(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (usingPassword) {
      await run(
        () => reauthenticateWithPassword(password),
        "비밀번호가 일치하지 않습니다."
      );
    } else if (challengeId === null) {
      setIsLoading(true);
      try {
        setChallengeId(await sendReauthenticationCode());
        toast("확인 코드를 보냈습니다. 이메일을 확인해 주세요.");
      } catch {
        toast.error("확인 코드를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
      setIsLoading(false);
    } else {
      await run(
        () => reauthenticateWithCode(challengeId, code),
        "확인 코드가 일치하지 않거나 만료되었습니다."
      );
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="text-lg">본인 확인</h3>
      <p className="text-neutral-500">
        {usingPassword
          ? "계속하려면 비밀번호를 입력해 주세요."
          : `계속하려면 ${email}(으)로 보내는 확인 코드를 입력해 주세요.`}
      </p>
      <form className="flex flex-col space-y-2" onSubmit={handleSubmit}>
        {usingPassword ? (
          <input
            type="password"
            autoComplete="current-password"
            className={inputClassName}
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        ) : (
          challengeId && (
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              className={inputClassName}
              placeholder="확인 코드"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          )
        )}
        <input
          type="submit"
          className={submitClassName}
          disabled={isLoading}
          value={
            usingPassword || challengeId ? "확인" : "확인 코드 보내기"
          }
        />
        {hasPassword && (
          <input
            type="button"
            className="text-blue-500 cursor-pointer"
            value={
              usingPassword ? "이메일로 확인하기" : "비밀번호로 확인하기"
            }
            onClick={() => setUsingPassword(!usingPassword)}
          />
        )}
      </form>
    </div>
  );
}
