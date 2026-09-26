"use client";

import {
  sendEmailVerificationCode,
  verifyEmailVerificationCode,
  verifyPassword,
} from "@/lib/actions/account";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { inputClassName, submitClassName } from "@/lib/form-styles";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  // The password field is always there, so password managers find it when
  // the page loads and fill it along with the email address. Whether it has
  // anything in it decides how to sign in.
  const [password, setPassword] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const usingPassword = challengeId === null && password !== "";

  async function verify(check: () => Promise<boolean>) {
    setIsVerifying(true);
    try {
      if (await check()) {
        router.push("/");
        router.refresh();
        return;
      }
      toast("로그인에 실패했습니다. 다시 시도해주세요.");
    } catch {
      toast("로그인에 실패했습니다. 다시 시도해주세요.");
    }
    setIsVerifying(false);
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email) {
      toast("이메일 주소를 입력해주세요.");
      return;
    }

    if (challengeId) {
      await verify(() => verifyEmailVerificationCode(challengeId, code));
    } else if (usingPassword) {
      await verify(() => verifyPassword(email, password));
    } else {
      setIsSendingCode(true);
      try {
        setChallengeId(await sendEmailVerificationCode(email));
        toast("로그인 코드를 보냈습니다. 이메일을 확인해 주세요.");
      } catch {
        toast("로그인에 실패했습니다. 다시 시도해주세요.");
      }
      setIsSendingCode(false);
    }
  }

  let buttonText;
  if (challengeId) {
    buttonText = "로그인 코드 인증";
  } else if (isSendingCode) {
    buttonText = "로그인 코드 보내는 중...";
  } else if (usingPassword) {
    buttonText = "로그인";
  } else {
    buttonText = "로그인 코드 보내기";
  }

  return (
    <form className="flex flex-col space-y-2" onSubmit={handleLogin}>
      <input
        type="email"
        id="username"
        name="username"
        autoComplete="username"
        aria-label="이메일 주소"
        className={inputClassName}
        placeholder="이메일 주소"
        disabled={challengeId !== null}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {challengeId ? (
        <input
          type="text"
          id="pin"
          name="code"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          aria-label="인증 코드"
          className={inputClassName}
          placeholder="인증 코드 입력"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      ) : (
        <input
          type="password"
          id="password"
          name="password"
          autoComplete="current-password"
          aria-label="비밀번호"
          className={inputClassName}
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      )}
      <input
        type="submit"
        className={submitClassName}
        value={buttonText}
        disabled={isSendingCode || isVerifying}
      />
      {!challengeId && (
        <p className="text-neutral-500 text-sm">
          비밀번호가 없으면 비워 두세요. 이메일로 로그인 코드를 보내 드립니다.
        </p>
      )}
    </form>
  );
}
