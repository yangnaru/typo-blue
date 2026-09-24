"use client";

import {
  sendEmailVerificationCodeForEmailChange,
  verifyEmailVerificationCodeAndChangeAccountEmail,
} from "@/lib/actions/account";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { inputClassName, submitClassName } from "@/lib/form-styles";

export default function ChangeEmailForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [emailInputDisabled, setEmailInputDisabled] = useState(false);
  const [buttonText, setButtonText] = useState("이메일 변경 코드 보내기");
  const [buttonDisabled, setButtonDisabled] = useState(false);

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email) {
      toast("이메일 주소를 입력해주세요.");
      return;
    }

    if (challengeId === null) {
      setButtonDisabled(true);
      setButtonText("이메일 변경 코드 보내는 중...");

      try {
        const challengeId = await sendEmailVerificationCodeForEmailChange(
          email
        );
        toast("이메일 변경 코드를 보냈습니다. 이메일을 확인해 주세요.");
        setEmailInputDisabled(true);
        setButtonText("이메일 변경 코드 인증");
        setButtonDisabled(false);
        setChallengeId(challengeId);
      } catch {
        toast("이메일 변경에 실패했습니다. 다시 시도해주세요.");
        setButtonDisabled(false);
        setButtonText("이메일 변경 코드 보내기");
      }
    }

    if (challengeId) {
      setButtonDisabled(true);
      try {
        const verified = await verifyEmailVerificationCodeAndChangeAccountEmail(
          challengeId,
          code
        );
        if (verified) {
          toast("이메일 변경에 성공했습니다.");
          router.refresh();
        } else {
          toast("이메일 변경에 실패했습니다. 다시 시도해주세요.");
        }
      } catch {
        toast("이메일 변경에 실패했습니다. 다시 시도해주세요.");
      } finally {
        setButtonDisabled(false);
      }
    }
  }

  return (
    <div>
      <h3 className="text-lg">이메일 변경</h3>
      <form className="flex flex-col space-y-2" onSubmit={handleSubmit}>
        <input
          type="email"
          id="email"
          autoComplete="email"
          className={inputClassName}
          placeholder="새 이메일 주소"
          disabled={emailInputDisabled}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {challengeId && (
          <input
            type="text"
            id="code"
            maxLength={6}
            autoComplete="off"
            className={inputClassName}
            placeholder="인증 코드 입력"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        )}
        <input
          type="submit"
          className={submitClassName}
          value={buttonText}
          disabled={buttonDisabled}
        />
      </form>
    </div>
  );
}
