"use client";

import {
  sendEmailVerificationCode,
  verifyEmailVerificationCode,
  verifyPassword,
} from "@/lib/actions/account";
import { useState } from "react";

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
      alert("이메일 주소를 입력해주세요.");
      return;
    }

    if (usingPassword) {
      verifyPassword(email, password).then((verified) => {
        if (verified) {
          window.location.href = "/";

          return;
        } else {
          alert("로그인에 실패했습니다. 다시 시도해주세요.");
        }
      });
    } else {
      if (challengeId === null) {
        setLoginButtonDisabled(true);
        setUsingPassword(false);
        setButtonText("로그인 코드 보내는 중...");

        try {
          const challengeId = await sendEmailVerificationCode(email);
          alert("로그인 코드를 보냈습니다. 이메일을 확인해 주세요.");
          setEmailInputDisabled(true);
          setButtonText("로그인 코드 인증");
          setLoginButtonDisabled(false);
          setChallengeId(challengeId);
        } catch (e) {
          alert("로그인에 실패했습니다. 다시 시도해주세요.");
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
            alert("로그인에 실패했습니다. 다시 시도해주세요.");
          }
        });
      }
    }
  }

  return (
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
      {usingPassword && (
        <>
          <input
            type="password"
            id="password"
            autoComplete="current-password"
            className="border border-blue-500 p-1 rounded-sm dark:bg-black dark:text-white"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </>
      )}
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
