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
  const [usingPassword, setUsingPassword] = useState<undefined | boolean>(
    undefined
  );
  const [password, setPassword] = useState("");

  const [email, setEmail] = useState("");
  const [emailInputDisabled, setEmailInputDisabled] = useState(false);
  const [buttonText, setButtonText] = useState("로그인 코드 보내기");
  const [loginButtonDisabled, setLoginButtonDisabled] = useState(false);

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");

  async function verify(check: () => Promise<boolean>) {
    setLoginButtonDisabled(true);
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
    setLoginButtonDisabled(false);
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email) {
      toast("이메일 주소를 입력해주세요.");
      return;
    }

    if (usingPassword) {
      await verify(() => verifyPassword(email, password));
    } else {
      if (challengeId === null) {
        setLoginButtonDisabled(true);
        setUsingPassword(false);
        setButtonText("로그인 코드 보내는 중...");

        try {
          const challengeId = await sendEmailVerificationCode(email);
          toast("로그인 코드를 보냈습니다. 이메일을 확인해 주세요.");
          setEmailInputDisabled(true);
          setButtonText("로그인 코드 인증");
          setLoginButtonDisabled(false);
          setChallengeId(challengeId);
        } catch {
          toast("로그인에 실패했습니다. 다시 시도해주세요.");
          setLoginButtonDisabled(false);
          setButtonText("로그인 코드 보내기");
        }
      }

      if (challengeId) {
        await verify(() => verifyEmailVerificationCode(challengeId, code));
      }
    }
  }

  return (
    <form className="flex flex-col space-y-2" onSubmit={handleLogin}>
      <input
        type="email"
        id="username"
        autoComplete="username"
        className={inputClassName}
        placeholder="이메일 주소"
        disabled={emailInputDisabled}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {usingPassword && (
        <input
          type="password"
          id="password"
          autoComplete="current-password"
          className={inputClassName}
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      )}
      {challengeId && (
        <input
          type="text"
          id="pin"
          maxLength={6}
          autoComplete="off"
          className={inputClassName}
          placeholder="인증 코드 입력"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      )}
      <input
        type="submit"
        className={submitClassName}
        value={buttonText}
        disabled={loginButtonDisabled}
      />
      {usingPassword === true && (
        <input
          type="button"
          className="text-blue-500 cursor-pointer"
          value="로그인 코드로 로그인"
          onClick={() => {
            setUsingPassword(undefined);
            setButtonText("로그인 코드 보내기");
          }}
        />
      )}
      {usingPassword === undefined && (
        <input
          type="button"
          className="text-blue-500 cursor-pointer"
          value="비밀번호로 로그인"
          onClick={() => {
            setUsingPassword(true);
            setButtonText("로그인");
          }}
        />
      )}
    </form>
  );
}
