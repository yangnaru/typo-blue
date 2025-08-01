"use server";

import { TimeSpan, createDate, isWithinExpirationDate } from "oslo";
import { generateRandomString, alphabet } from "oslo/crypto";
import { MailgunTransport } from "@upyo/mailgun";
import { createMessage } from "@upyo/core";
import {
  createSession,
  deleteSessionTokenCookie,
  generateSessionToken,
  getCurrentSession,
  invalidateSession,
  setSessionTokenCookie,
} from "../auth";
import { redirect } from "next/navigation";
import { hash, verify } from "@node-rs/argon2";
import { getAccountPath, getRootPath } from "../paths";
import { db } from "../db";
import {
  emailVerificationChallenge,
  user as userTable,
  blog as blogTable,
  session as sessionTable,
} from "@/drizzle/schema";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

export async function setPassword(prevState: any, formData: FormData) {
  const { user } = await getCurrentSession();

  if (!user) {
    return { message: "로그인이 필요합니다." };
  }

  const password = formData.get("password") as string;
  const passwordConfirm = formData.get("password_confirm") as string;

  if (password.length < 8) {
    return { message: "비밀번호는 8자 이상이어야 합니다." };
  }

  if (password !== passwordConfirm) {
    return { message: "비밀번호가 일치하지 않습니다." };
  }

  const passwordHash = await hash(password);
  await db
    .update(userTable)
    .set({ passwordHash })
    .where(eq(userTable.id, user.id));

  redirect(getAccountPath());
}

export async function sendEmailVerificationCode(
  email: string
): Promise<string> {
  const code = generateRandomString(6, alphabet("0-9"));

  const uuid = randomUUID();
  const challenge = {
    id: uuid,
    email,
    code,
    expires: createDate(new TimeSpan(5, "m")), // 5 minutes
  };
  await db.insert(emailVerificationChallenge).values(challenge);

  const transport = new MailgunTransport({
    apiKey: process.env.MAILGUN_API_KEY!,
    domain: process.env.MAILGUN_DOMAIN!,
  });

  const message = createMessage({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "타이포 블루 로그인 코드",
    content: { text: code },
  });

  const receipt = await transport.send(message);
  if (receipt.successful) {
    console.log("Message sent with ID:", receipt.messageId);
  } else {
    console.error("Send failed:", receipt.errorMessages.join(", "));
  }

  return challenge.id;
}

export async function sendEmailVerificationCodeForEmailChange(
  email: string
): Promise<string> {
  const user = (
    await db.select().from(userTable).where(eq(userTable.email, email))
  )[0];

  if (user) {
    throw new Error("이미 존재하는 이메일 주소입니다.");
  }

  const code = generateRandomString(6, alphabet("0-9"));

  const uuid = randomUUID();
  const challenge = {
    id: uuid,
    email,
    code,
    expires: createDate(new TimeSpan(5, "m")), // 5 minutes
  };
  await db.insert(emailVerificationChallenge).values(challenge);

  const transport = new MailgunTransport({
    apiKey: process.env.MAILGUN_API_KEY!,
    domain: process.env.MAILGUN_DOMAIN!,
  });

  const message = createMessage({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "타이포 블루 이메일 변경 코드",
    content: { text: code },
  });

  const receipt = await transport.send(message);
  if (receipt.successful) {
    console.log("Message sent with ID:", receipt.messageId);
  } else {
    console.error("Send failed:", receipt.errorMessages.join(", "));
  }

  return challenge.id;
}

export async function verifyEmailVerificationCodeAndChangeAccountEmail(
  challengeId: string,
  code: string
) {
  const { user } = await getCurrentSession();

  if (!user) {
    return false;
  }

  const challenge = (
    await db
      .select()
      .from(emailVerificationChallenge)
      .where(eq(emailVerificationChallenge.id, challengeId))
  )[0];

  if (!challenge) {
    return false;
  }

  if (!isWithinExpirationDate(new Date(challenge.expires))) {
    return false;
  }

  if (challenge.code !== code) {
    return false;
  }

  await db.transaction(async (tx) => {
    const existingUser = (
      await tx
        .select()
        .from(userTable)
        .where(eq(userTable.email, challenge.email))
    )[0];

    if (existingUser) {
      return false;
    }

    await tx
      .update(userTable)
      .set({ email: challenge.email })
      .where(eq(userTable.id, user.id));
  });

  return true;
}

export async function verifyPassword(
  email: string,
  password: string
): Promise<boolean> {
  const user = (
    await db.select().from(userTable).where(eq(userTable.email, email))
  )[0];

  if (!user) {
    return false;
  }

  if (!user.passwordHash) {
    return false;
  }

  const passwordVerified = await verify(user.passwordHash, password);

  if (!passwordVerified) {
    return false;
  }

  const sessionToken = generateSessionToken();
  const sessionCookie = await createSession(sessionToken, user.id);

  await setSessionTokenCookie(sessionToken, new Date(sessionCookie.expires));

  return true;
}

export async function verifyEmailVerificationCode(
  challengeId: string,
  code: string
) {
  const challenge = (
    await db
      .select()
      .from(emailVerificationChallenge)
      .where(eq(emailVerificationChallenge.id, challengeId))
  )[0];

  if (!challenge) {
    return false;
  }

  if (!isWithinExpirationDate(new Date(challenge.expires))) {
    return false;
  }

  if (challenge.code !== code) {
    return false;
  }

  const existingUser = (
    await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, challenge.email))
  )[0];

  if (!existingUser) {
    // create user
    const newUser = await db
      .insert(userTable)
      .values({
        id: randomUUID(),
        email: challenge.email,
        updated: new Date(),
      })
      .returning({ id: userTable.id });
    const sessionToken = generateSessionToken();
    const sessionCookie = await createSession(sessionToken, newUser[0].id);

    await setSessionTokenCookie(sessionToken, new Date(sessionCookie.expires));
  } else {
    const sessionToken = generateSessionToken();
    const sessionCookie = await createSession(sessionToken, existingUser.id);

    await setSessionTokenCookie(sessionToken, new Date(sessionCookie.expires));
  }

  return true;
}

export async function logout() {
  const { session } = await getCurrentSession();
  if (!session) {
    return {
      error: "Unauthorized",
    };
  }

  await invalidateSession(session.id);
  await deleteSessionTokenCookie();

  return redirect(getRootPath());
}

export async function sendAccountDeletionVerificationCode(): Promise<string> {
  const { user } = await getCurrentSession();

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const code = generateRandomString(6, alphabet("0-9"));

  const uuid = randomUUID();
  const challenge = {
    id: uuid,
    email: user.email,
    code,
    expires: createDate(new TimeSpan(10, "m")), // 10 minutes for account deletion
  };
  await db.insert(emailVerificationChallenge).values(challenge);

  const transport = new MailgunTransport({
    apiKey: process.env.MAILGUN_API_KEY!,
    domain: process.env.MAILGUN_DOMAIN!,
  });

  const message = createMessage({
    from: process.env.EMAIL_FROM!,
    to: user.email,
    subject: "타이포 블루 계정 삭제 인증 코드",
    content: {
      text: `계정 삭제 인증 코드: ${code}\n\n이 코드는 10분 후에 만료됩니다. 계정 삭제를 원하지 않으시면 이 메일을 무시하세요.`,
      html: `<h2>계정 삭제 인증 코드</h2><p><strong>${code}</strong></p><p>이 코드는 10분 후에 만료됩니다.</p><p>계정 삭제를 원하지 않으시면 이 메일을 무시하세요.</p>`,
    },
  });

  const receipt = await transport.send(message);
  if (receipt.successful) {
    console.log(
      "Account deletion verification message sent with ID:",
      receipt.messageId
    );
  } else {
    console.error("Send failed:", receipt.errorMessages.join(", "));
    throw new Error("이메일 발송에 실패했습니다.");
  }

  return challenge.id;
}

export async function deleteAccount(
  challengeId: string,
  code: string
): Promise<boolean> {
  const { user, session } = await getCurrentSession();

  if (!user || !session) {
    throw new Error("로그인이 필요합니다.");
  }

  const challenge = (
    await db
      .select()
      .from(emailVerificationChallenge)
      .where(eq(emailVerificationChallenge.id, challengeId))
  )[0];

  if (!challenge) {
    throw new Error("유효하지 않은 인증 코드입니다.");
  }

  if (!isWithinExpirationDate(new Date(challenge.expires))) {
    throw new Error("인증 코드가 만료되었습니다.");
  }

  if (challenge.code !== code) {
    throw new Error("인증 코드가 일치하지 않습니다.");
  }

  if (challenge.email !== user.email) {
    throw new Error("인증 코드가 현재 계정과 일치하지 않습니다.");
  }

  // Delete account and all related data in a transaction
  await db.transaction(async (tx) => {
    // Delete all user's blogs (cascade will handle posts and related data)
    await tx.delete(blogTable).where(eq(blogTable.userId, user.id));

    // Delete all user's sessions
    await tx.delete(sessionTable).where(eq(sessionTable.userId, user.id));

    // Delete the user
    await tx.delete(userTable).where(eq(userTable.id, user.id));

    // Clean up the verification challenge
    await tx
      .delete(emailVerificationChallenge)
      .where(eq(emailVerificationChallenge.id, challengeId));
  });

  // Clear the session cookie
  await deleteSessionTokenCookie();

  return true;
}
