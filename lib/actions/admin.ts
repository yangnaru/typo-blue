"use server";

import { redirect } from "next/navigation";
import { getRootPath } from "../paths";
import {
  createSession,
  generateSessionToken,
  setSessionTokenCookie,
} from "../auth";

export async function impersonateUser(userId: string) {
  const sessionToken = generateSessionToken();
  const session = await createSession(sessionToken, userId);

  await setSessionTokenCookie(sessionToken, new Date(session.expires));

  redirect(getRootPath());
}
