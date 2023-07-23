"use client";

import { useSession } from "next-auth/react";
import LinkButton from "./LinkButton";

export default function LoginStatus() {
    const session = useSession();

    return session.data === undefined
        ? <></>
        : session.data
            ? <LinkButton href="/account">{session.data.user?.email ?? ''}</LinkButton>
            : <LinkButton href="/auth/signin">로그인</LinkButton>
}
