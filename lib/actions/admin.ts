"use server";

import { cookies } from "next/headers";
import { lucia } from "../auth";
import { redirect } from "next/navigation";
import { getRootPath } from "../paths";

export async function impersonateUser(userId: number) {
  const session = await lucia.createSession(userId, {});
  const sessionCookie = lucia.createSessionCookie(session.id);

  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );

  redirect(getRootPath());
}
