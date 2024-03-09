"use server";

import { validateRequest } from "@/lib/auth";
import LinkButton from "./LinkButton";

export default async function LoginStatus() {
  console.log("test");
  const { user } = await validateRequest();
  console.log(user);

  return user ? (
    <LinkButton href="/account">{user.email ?? ""}</LinkButton>
  ) : (
    <LinkButton href="/auth/signin">로그인</LinkButton>
  );
}
