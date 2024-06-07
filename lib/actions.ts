"use server";

import { TimeSpan, createDate, isWithinExpirationDate } from "oslo";
import { generateRandomString, alphabet } from "oslo/crypto";
import { prisma } from "./db";
import { TransportOptions, createTransport } from "nodemailer";
import { lucia, validateRequest } from "./auth";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sanitize from "sanitize-html";
import { encodePostId } from "./server-util";
import { hash, verify } from "@node-rs/argon2";

export async function setPassword(prevState: any, formData: FormData) {
  const { user } = await validateRequest();

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

  redirect("/account");
}

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
  const { user } = await validateRequest();

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
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

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

  const session = await lucia.createSession(user.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);

  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );

  return true;
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
        if (e.message.includes("userId")) {
          return { error: "이미 블로그를 만들었습니다." };
        } else {
          return { error: "이미 존재하는 블로그 ID입니다." };
        }
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

export async function writeToGuestbook(formData: FormData) {
  const blogId = formData.get("blogId") as string;
  const content = formData.get("content") as string;

  const { user } = await validateRequest();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const blog = await prisma.blog.findUnique({
    where: {
      slug: blogId,
    },
  });

  if (!blog) {
    return { error: "블로그를 찾을 수 없습니다." };
  }

  if (user.id === blog.userId) {
    return { error: "자신의 블로그에는 방명록을 남길 수 없습니다." };
  }

  const guestbook = await prisma.guestbook.create({
    data: {
      content: sanitize(content),
      blog: {
        connect: {
          slug: blogId,
        },
      },
      author: {
        connect: {
          email: user.email,
        },
      },
    },
  });

  revalidatePath(`/@${blogId}/guestbook`);

  redirect(`/@${blogId}/guestbook/${encodePostId(guestbook.uuid)}`);
}

export async function saveGuestbookReply(formData: FormData) {
  const content = formData.get("content") as string;
  const guestbookId = formData.get("guestbookId") as string;

  const { user } = await validateRequest();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const guestbook = await prisma.guestbook.findUnique({
    where: {
      uuid: guestbookId,
    },
    include: {
      blog: true,
    },
  });

  if (!guestbook) {
    return { error: "방명록 게시글을 찾을 수 없습니다." };
  }

  if (user.id !== guestbook.blog.userId) {
    return { error: "권한이 없습니다." };
  }

  await prisma.guestbook.update({
    where: {
      uuid: guestbookId,
    },
    data: {
      reply: sanitize(content),
      repliedAt: new Date(),
    },
  });

  revalidatePath(`/@${guestbook.blog.slug}/guestbook`);

  redirect(`/@${guestbook.blog.slug}/guestbook/${encodePostId(guestbookId)}`);
}

export async function deleteGuestbook(uuid: string) {
  const { user } = await validateRequest();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const guestbook = await prisma.guestbook.findUnique({
    where: {
      uuid,
    },
    include: {
      blog: true,
    },
  });

  if (!guestbook) {
    return { error: "방명록 게시글을 찾을 수 없습니다." };
  }

  if (!(user.id === guestbook.blog.userId || user.id === guestbook.authorId)) {
    return { error: "권한이 없습니다." };
  }

  if (user.id === guestbook.authorId && guestbook.repliedAt) {
    return { error: "답변이 달린 방명록은 삭제할 수 없습니다." };
  }

  await prisma.guestbook.delete({
    where: {
      uuid,
    },
  });

  revalidatePath(`/@${guestbook.blog.slug}/guestbook`);

  redirect(`/@${guestbook.blog.slug}/guestbook`);
}

export async function followBlog(formData: FormData) {
  const blogId = formData.get("blogId") as string;

  const { user } = await validateRequest();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    include: {
      blog: true,
    },
  });

  if (!currentUser) {
    return { error: "로그인이 필요합니다." };
  }

  if (!currentUser.blog) {
    return { error: "블로그를 만들어야 팔로우할 수 있습니다." };
  }

  const blog = await prisma.blog.findUnique({
    where: {
      slug: blogId,
    },
  });

  if (!blog) {
    return { error: "블로그를 찾을 수 없습니다." };
  }

  if (user.id === blog.userId) {
    return { error: "자신의 블로그를 팔로우할 수 없습니다." };
  }

  try {
    await prisma.follow.create({
      data: {
        followerId: currentUser.blog.id,
        followingId: blog.id,
      },
    });
  } catch {}

  revalidatePath(`/@${blogId}`);
  redirect(`/@${blogId}`);
}

export async function unfollowBlog(formData: FormData) {
  const blogId = formData.get("blogId") as string;

  const { user } = await validateRequest();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    include: {
      blog: true,
    },
  });

  if (!currentUser) {
    return { error: "로그인이 필요합니다." };
  }

  if (!currentUser.blog) {
    return { error: "블로그를 만들어야 팔로우할 수 있습니다." };
  }

  const blog = await prisma.blog.findUnique({
    where: {
      slug: blogId,
    },
  });

  if (!blog) {
    return { error: "블로그를 찾을 수 없습니다." };
  }

  if (user.id === blog.userId) {
    return { error: "자신의 블로그를 팔로우할 수 없습니다." };
  }

  try {
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: currentUser.blog.id,
          followingId: blog.id,
        },
      },
    });
  } catch {}

  revalidatePath(`/@${blogId}`);
  redirect(`/@${blogId}`);
}
