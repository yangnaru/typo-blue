"use client";

import {
  sendEmailVerificationCode,
  verifyEmailVerificationCode,
  verifyPassword,
} from "@/lib/actions/account";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Login() {
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

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email) {
      toast("이메일 주소를 입력해주세요.");
      return;
    }

    if (usingPassword) {
      verifyPassword(email, password).then((verified) => {
        if (verified) {
          window.location.href = "/";

          return;
        } else {
          toast("로그인에 실패했습니다. 다시 시도해주세요.");
        }
      });
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
        } catch (e) {
          toast("로그인에 실패했습니다. 다시 시도해주세요.");
          setLoginButtonDisabled(false);
          setButtonText("로그인 링크 보내기");
        }
      }

      if (challengeId) {
        verifyEmailVerificationCode(challengeId, code).then((verified) => {
          if (verified) {
            window.location.href = "/";

            return;
          } else {
            toast("로그인에 실패했습니다. 다시 시도해주세요.");
          }
        });
      }
    }
  }

  return (
    <form className="flex flex-col space-y-2" onSubmit={handleLogin}>
      <Input
        type="email"
        id="username"
        autoComplete="username"
        placeholder="이메일 주소"
        disabled={emailInputDisabled}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {usingPassword && (
        <>
          <Input
            type="password"
            id="password"
            autoComplete="current-password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </>
      )}
      {challengeId && (
        <Input
          type="text"
          id="pin"
          maxLength={6}
          autoComplete="off"
          placeholder="인증 코드 입력"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      )}
      <Button
        type="submit"
        disabled={loginButtonDisabled}
      >
        {buttonText}
      </Button>
      {usingPassword === true && (
        <Button
          type="button"
          variant="link"
          onClick={() => {
            setUsingPassword(undefined);
            setButtonText("로그인 코드 보내기");
          }}
        >
          로그인 코드로 로그인
        </Button>
      )}
      {usingPassword === undefined && (
        <Button
          type="button"
          variant="link"
          onClick={() => {
            setUsingPassword(true);
            setButtonText("로그인");
          }}
        >
          비밀번호로 로그인
        </Button>
      )}
    </form>
  );
}
