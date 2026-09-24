"use server";

import { TimeSpan, createDate } from "oslo";
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
import { clearAdminSession } from "./admin";
import { hash, verify } from "@node-rs/argon2";
import { getAccountPath, getRootPath } from "../paths";
import { db } from "../db";
import {
  emailVerificationChallenge,
  user as userTable,
  blog as blogTable,
  session as sessionTable,
} from "@/drizzle/schema";
import { randomUUID, timingSafeEqual } from "crypto";
import { and, count, eq, gt, lt, sql } from "drizzle-orm";
import { isUuid } from "../utils";

type ChallengePurpose = "sign-in" | "change-email" | "delete-account";

// A code is 6 digits, so limit how many guesses it takes and how many codes
// can be live for an address at once
const MAX_CHALLENGE_ATTEMPTS = 5;
const MAX_ACTIVE_CHALLENGES = 3;

async function createChallenge(
  email: string,
  purpose: ChallengePurpose,
  lifetime: TimeSpan
) {
  const [{ active }] = await db
    .select({ active: count() })
    .from(emailVerificationChallenge)
    .where(
      and(
        eq(emailVerificationChallenge.email, email),
        gt(emailVerificationChallenge.expires, new Date())
      )
    );
  if (active >= MAX_ACTIVE_CHALLENGES) {
    throw new Error("잠시 후 다시 시도해 주세요.");
  }

  const challenge = {
    id: randomUUID(),
    email,
    code: generateRandomString(6, alphabet("0-9")),
    purpose,
    expires: createDate(lifetime),
  };
  await db.insert(emailVerificationChallenge).values(challenge);
  return challenge;
}

// Counts the attempt, and uses the challenge up when the code matches
async function consumeChallenge(
  challengeId: string,
  code: string,
  purpose: ChallengePurpose
) {
  if (!isUuid(challengeId)) return null;

  const [challenge] = await db
    .update(emailVerificationChallenge)
    .set({ attempts: sql`${emailVerificationChallenge.attempts} + 1` })
    .where(
      and(
        eq(emailVerificationChallenge.id, challengeId),
        eq(emailVerificationChallenge.purpose, purpose),
        gt(emailVerificationChallenge.expires, new Date()),
        lt(emailVerificationChallenge.attempts, MAX_CHALLENGE_ATTEMPTS)
      )
    )
    .returning();
  if (!challenge) return null;

  const expected = Buffer.from(challenge.code);
  const given = Buffer.from(code);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return null;
  }

  // Only one request gets to use it
  const deleted = await db
    .delete(emailVerificationChallenge)
    .where(eq(emailVerificationChallenge.id, challengeId))
    .returning({ id: emailVerificationChallenge.id });
  if (deleted.length === 0) return null;

  return challenge;
}

export async function setPassword(
  prevState: { message: string },
  formData: FormData
) {
  const { user } = await getCurrentSession();

  if (!user) {
    return { message: "로그인이 필요합니다." };
  }

  const password = formData.get("password");
  const passwordConfirm = formData.get("password_confirm");

  if (typeof password !== "string" || password.length < 8) {
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
  const challenge = await createChallenge(
    email,
    "sign-in",
    new TimeSpan(5, "m")
  );

  const transport = new MailgunTransport({
    apiKey: process.env.MAILGUN_API_KEY!,
    domain: process.env.MAILGUN_DOMAIN!,
  });

  const message = createMessage({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "타이포 블루 로그인 코드",
    content: { text: challenge.code },
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
  const { user: sessionUser } = await getCurrentSession();
  if (!sessionUser) {
    throw new Error("로그인이 필요합니다.");
  }

  const user = (
    await db.select().from(userTable).where(eq(userTable.email, email))
  )[0];

  if (user) {
    throw new Error("이미 존재하는 이메일 주소입니다.");
  }

  const challenge = await createChallenge(
    email,
    "change-email",
    new TimeSpan(5, "m")
  );

  const transport = new MailgunTransport({
    apiKey: process.env.MAILGUN_API_KEY!,
    domain: process.env.MAILGUN_DOMAIN!,
  });

  const message = createMessage({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "타이포 블루 이메일 변경 코드",
    content: { text: challenge.code },
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

  const challenge = await consumeChallenge(challengeId, code, "change-email");
  if (!challenge) {
    return false;
  }

  try {
    return await db.transaction(async (tx) => {
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
      return true;
    });
  } catch (error) {
    // Taken by someone else in the meantime
    console.error("Failed to change email:", error);
    return false;
  }
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
  const challenge = await consumeChallenge(challengeId, code, "sign-in");
  if (!challenge) {
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
  if (session) {
    await invalidateSession(session.id);
  }
  await deleteSessionTokenCookie();
  await clearAdminSession();

  return redirect(getRootPath());
}

export async function sendAccountDeletionVerificationCode(): Promise<string> {
  const { user } = await getCurrentSession();

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const challenge = await createChallenge(
    user.email,
    "delete-account",
    new TimeSpan(10, "m")
  );
  const code = challenge.code;

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

  const challenge = await consumeChallenge(
    challengeId,
    code,
    "delete-account"
  );

  // Returned rather than thrown: Next hides thrown messages in production
  if (!challenge || challenge.email !== user.email) {
    return false;
  }

  // Delete account and all related data in a transaction
  await db.transaction(async (tx) => {
    // Delete all user's blogs (cascade will handle posts and related data)
    await tx.delete(blogTable).where(eq(blogTable.userId, user.id));

    // Delete all user's sessions
    await tx.delete(sessionTable).where(eq(sessionTable.userId, user.id));

    // Delete the user
    await tx.delete(userTable).where(eq(userTable.id, user.id));

  });

  // Clear the session cookie
  await deleteSessionTokenCookie();

  return true;
}
