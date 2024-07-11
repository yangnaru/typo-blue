"use client";

import {
  sendEmailVerificationCodeForEmailChange,
  verifyEmailVerificationCodeAndChangeAccountEmail,
} from "@/lib/actions/account";
import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [emailInputDisabled, setEmailInputDisabled] = useState(false);
  const [buttonText, setButtonText] = useState("로그인 코드 보내기");
  const [loginButtonDisabled, setLoginButtonDisabled] = useState(false);

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email) {
      alert("이메일 주소를 입력해주세요.");
      return;
    }

    if (challengeId === null) {
      setLoginButtonDisabled(true);
      setButtonText("이메일 변경 코드 보내는 중...");

      try {
        const challengeId = await sendEmailVerificationCodeForEmailChange(
          email
        );
        alert("이메일 변경 코드를 보냈습니다. 이메일을 확인해 주세요.");
        setEmailInputDisabled(true);
        setButtonText("이메일 변경 코드 인증");
        setLoginButtonDisabled(false);
        setChallengeId(challengeId);
      } catch (e) {
        alert("이메일 변경에 실패했습니다. 다시 시도해주세요.");
        setLoginButtonDisabled(false);
        setButtonText("이메일 변경 코드 보내기");
      }
    }

    if (challengeId) {
      verifyEmailVerificationCodeAndChangeAccountEmail(challengeId, code).then(
        (verified) => {
          if (verified) {
            alert("이메일 변경에 성공했습니다.");
            window.location.href = "/account";

            return;
          } else {
            alert("이메일 변경에 실패했습니다. 다시 시도해주세요.");
          }
        }
      );
    }
  }

  return (
    <div>
      <h3 className="text-lg">이메일 변경</h3>
      <form className="flex flex-col space-y-2" onSubmit={handleLogin}>
        <input
          type="email"
          id="username"
          autoComplete="username"
          className="border border-blue-500 p-1 rounded-sm dark:bg-black dark:text-white"
          placeholder="이메일 주소"
          disabled={emailInputDisabled}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        ></input>
        {challengeId && (
          <input
            type="text"
            id="pin"
            maxLength={6}
            autoComplete="off"
            className="border border-blue-500 p-1 rounded-sm dark:bg-black dark:text-white"
            placeholder="인증 코드 입력"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        )}
        <input
          type="submit"
          className="border border-blue-500 p-1 rounded-sm hover:bg-blue-300 hover:text-black"
          value={buttonText}
          disabled={loginButtonDisabled}
        />
      </form>
    </div>
  );
}
