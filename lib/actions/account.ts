"use server";

import { TimeSpan, createDate, isWithinExpirationDate } from "oslo";
import { generateRandomString, alphabet } from "oslo/crypto";
import { TransportOptions, createTransport } from "nodemailer";
import {
  createSession,
  generateSessionToken,
  getCurrentSession,
  setSessionTokenCookie,
} from "../auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hash, verify } from "@node-rs/argon2";
import { getAccountPath, getRootPath } from "../paths";
import { db } from "../db";
import {
  emailVerificationChallenge,
  user as userTable,
  NewEmailVerificationChallenge,
} from "../schema";
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
  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      passwordHash,
    },
  });

  redirect(getAccountPath());
}

export async function sendEmailVerificationCode(
  email: string
): Promise<string> {
  const code = generateRandomString(6, alphabet("0-9"));

  const uuid = randomUUID();
  const challenge: NewEmailVerificationChallenge = {
    id: uuid,
    email,
    code,
    expiresAt: createDate(new TimeSpan(5, "m")), // 5 minutes
  };
  await db.insert(emailVerificationChallenge).values(challenge);

  const transporter = createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: process.env.EMAIL_SERVER_PORT,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  } as TransportOptions);

  const info: any = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "타이포 블루 로그인 코드",
    text: code,
  });

  return challenge.id;
}

export async function sendEmailVerificationCodeForEmailChange(
  email: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (user) {
    throw new Error("이미 존재하는 이메일 주소입니다.");
  }

  const code = generateRandomString(6, alphabet("0-9"));

  const challenge = await prisma.emailVerificationChallenge.create({
    data: {
      email,
      code,
      expiresAt: createDate(new TimeSpan(5, "m")), // 5 minutes
    },
  });

  const transporter = createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: process.env.EMAIL_SERVER_PORT,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  } as TransportOptions);

  const info: any = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "타이포 블루 이메일 변경 코드",
    text: code,
  });

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

  const challenge = await prisma.emailVerificationChallenge.findUnique({
    where: {
      id: challengeId,
    },
  });

  if (!challenge) {
    return false;
  }

  if (!isWithinExpirationDate(challenge.expiresAt)) {
    return false;
  }

  if (challenge.code !== code) {
    return false;
  }

  await prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: {
        email: challenge.email,
      },
    });

    if (existingUser) {
      return false;
    }

    await tx.user.update({
      where: {
        id: user.id,
      },
      data: {
        email: challenge.email,
      },
    });
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

  console.log({ user });

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

  await setSessionTokenCookie(sessionToken, sessionCookie.expiresAt);

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

  if (!isWithinExpirationDate(challenge.expiresAt)) {
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
        email: challenge.email,
        updatedAt: new Date(),
      })
      .returning({ id: userTable.id });
    const sessionToken = generateSessionToken();
    const sessionCookie = await createSession(sessionToken, newUser[0].id);

    await setSessionTokenCookie(sessionToken, sessionCookie.expiresAt);
  } else {
    const sessionToken = generateSessionToken();
    const sessionCookie = await createSession(sessionToken, existingUser.id);

    await setSessionTokenCookie(sessionToken, sessionCookie.expiresAt);
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

  await lucia.invalidateSession(session.id);

  const sessionCookie = lucia.createBlankSessionCookie();
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );
  return redirect(getRootPath());
}
