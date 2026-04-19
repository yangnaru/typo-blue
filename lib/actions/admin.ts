"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { user } from "@/drizzle/schema";
import { getLoginPath, getRootPath } from "../paths";
import {
  createSession,
  deleteSessionTokenCookie,
  generateSessionToken,
  getCurrentSession,
  invalidateSessionByToken,
  setSessionTokenCookie,
  validateSessionToken,
} from "../auth";

const ADMIN_SESSION_COOKIE = "admin_session";

export async function impersonateUser(userId: string) {
  const { user: current, session: currentSession } = await getCurrentSession();
  if (!current?.isAdmin) {
    throw new Error("Unauthorized");
  }

  const cookieStore = await cookies();
  const existingToken = cookieStore.get("session")?.value;
  if (existingToken && currentSession) {
    cookieStore.set(ADMIN_SESSION_COOKIE, existingToken, {
      domain: process.env.SESSION_COOKIE_DOMAIN,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: new Date(currentSession.expires),
      path: "/",
    });
  }

  const sessionToken = generateSessionToken();
  const session = await createSession(sessionToken, userId);

  await setSessionTokenCookie(sessionToken, new Date(session.expires));

  redirect(getRootPath());
}

export async function exitImpersonation() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!adminToken) {
    throw new Error("Not impersonating");
  }

  const currentToken = cookieStore.get("session")?.value;
  if (currentToken && currentToken !== adminToken) {
    await invalidateSessionByToken(currentToken);
  }

  const validated = await validateSessionToken(adminToken);

  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    domain: process.env.SESSION_COOKIE_DOMAIN,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });

  if (validated.session) {
    await setSessionTokenCookie(adminToken, new Date(validated.session.expires));
    redirect("/admin");
  } else {
    await deleteSessionTokenCookie();
    redirect(getLoginPath());
  }
}

export async function toggleUserAdmin(userId: string) {
  const { user: current } = await getCurrentSession();
  if (!current?.isAdmin) {
    throw new Error("Unauthorized");
  }
  if (current.id === userId) {
    throw new Error("Cannot change own admin status");
  }
  const [target] = await db
    .select({ isAdmin: user.isAdmin })
    .from(user)
    .where(eq(user.id, userId));
  if (!target) {
    throw new Error("User not found");
  }
  await db
    .update(user)
    .set({ isAdmin: !target.isAdmin, updated: new Date() })
    .where(eq(user.id, userId));
  revalidatePath("/admin");
}
