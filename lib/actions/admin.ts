"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { user } from "@/drizzle/schema";
import { getRootPath } from "../paths";
import {
  createSession,
  generateSessionToken,
  getCurrentSession,
  setSessionTokenCookie,
} from "../auth";

export async function impersonateUser(userId: string) {
  const sessionToken = generateSessionToken();
  const session = await createSession(sessionToken, userId);

  await setSessionTokenCookie(sessionToken, new Date(session.expires));

  redirect(getRootPath());
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
