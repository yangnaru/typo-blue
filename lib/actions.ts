"use server";

import { TimeSpan, createDate, isWithinExpirationDate } from "oslo";
import { generateRandomString, alphabet } from "oslo/crypto";
import { prisma } from "./db";
import { TransportOptions, createTransport } from "nodemailer";
import { lucia, validateRequest } from "./auth";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function sendEmailVerificationCode(
  email: string
): Promise<string> {
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
    subject: "타이포 블루 로그인 코드",
    text: code,
  });

  console.log("Message sent: %s", info.messageId);

  return challenge.id;
}

export async function verifyEmailVerificationCode(
  challengeId: string,
  code: string
) {
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

  let user;
  user = await prisma.user.findUnique({
    where: {
      email: challenge.email,
    },
  });

  if (!user) {
    // create user
    user = await prisma.user.create({
      data: {
        email: challenge.email,
      },
    });
  }
  const session = await lucia.createSession(user.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);

  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );

  return true;
}

export async function createBlog(blogId: string) {
  const { user } = await validateRequest();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const blogs = await prisma.blog.findMany({
    where: {
      user: {
        email: user.email,
      },
    },
  });

  if (blogs.length >= 3) {
    return { error: "블로그는 최대 3개까지 만들 수 있습니다." };
  }

  const regex = /^[0-9a-zA-Z(\_)]+$/;
  if (!(0 < blogId.length && blogId.length < 20) || !regex.test(blogId)) {
    return {
      error:
        "블로그 ID는 1자 이상 20자 이하의 영문, 숫자, 밑줄만 사용할 수 있습니다.",
    };
  }

  const existingBlog = await prisma.blog.findFirst({
    where: {
      slug: {
        equals: blogId,
        mode: "insensitive",
      },
    },
  });

  if (existingBlog) {
    return { error: "이미 존재하는 블로그 ID입니다." };
  }

  try {
    const q = await prisma.blog.create({
      data: {
        slug: blogId,
        user: {
          connect: {
            email: user.email,
          },
        },
      },
    });

    return { blogId: q.slug };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return { error: "이미 존재하는 블로그 ID입니다." };
      }
    }
    return { error: "알 수 없는 오류가 발생했습니다." };
  }
}

export async function deleteBlog(blogId: string) {
  const { user } = await validateRequest();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const blog = await prisma.blog.findUnique({
    where: {
      slug: blogId,
    },
    include: {
      user: true,
    },
  });

  if (!blog) {
    return { error: "블로그를 찾을 수 없습니다." };
  }

  if (blog.user.email !== user.email) {
    return { error: "권한이 없습니다." };
  }

  await prisma.blog.delete({
    where: {
      slug: blogId,
    },
  });

  revalidatePath("/account");

  return { status: "success" };
}
