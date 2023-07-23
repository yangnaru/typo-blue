"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function Login() {
    const [email, setEmail] = useState("");
    const [buttonText, setButtonText] = useState("로그인 링크 보내기");
    const [loginButtonDisabled, setLoginButtonDisabled] = useState(false);
    
    async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoginButtonDisabled(true);
        setButtonText("로그인 링크 보내는 중...");

        const response = await signIn('email', { email: email, callbackUrl: '/', redirect: false })

        if (response?.error) {
            alert('로그인에 실패했습니다. 다시 시도해주세요.')
            setLoginButtonDisabled(false);
            setButtonText("로그인 링크 보내기");
        }

        if (!response?.error) {
            alert('로그인 링크를 보냈습니다. 이메일을 확인해 주세요.')
            window.location.href = '/';
        }
    }

    return (
        <form className="space-x-2" onSubmit={handleLogin}>
            <input type="email" id="username" autoComplete="username" className="border border-blue-500 p-1 rounded-sm dark:bg-black dark:text-white" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)}></input>
            <input type="submit" className="border border-blue-500 p-1 rounded-sm hover:bg-blue-300 hover:text-black" value={buttonText} disabled={loginButtonDisabled} />
        </form>
    )
}
