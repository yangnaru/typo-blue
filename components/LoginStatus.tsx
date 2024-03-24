"use server";

import { validateRequest } from "@/lib/auth";
import LinkButton from "./LinkButton";

export default async function LoginStatus() {
  const { user } = await validateRequest();

  return user ? (
    <LinkButton href="/account">{user.email ?? ""}</LinkButton>
  ) : (
    <LinkButton href="/auth/signin">로그인</LinkButton>
  );
}
