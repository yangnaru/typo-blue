"use server";

import { getCurrentSession } from "../auth";
import { revalidatePath } from "next/cache";
import { decodePostId, encodePostId } from "../utils";
import { db } from "../db";
import { blog, post } from "@/drizzle/schema";
import { and, eq, isNull } from "drizzle-orm";
import { sendPostNotificationEmail } from "./mailing-list";

export async function createBlog(blogId: string) {
  const { user } = await getCurrentSession();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const blogs = await db.query.blog.findMany({
    where: eq(blog.userId, user.id),
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

  const existingBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogId.toLowerCase()),
  });

  if (existingBlog) {
    return { error: "이미 존재하는 블로그 ID입니다." };
  }

  try {
    const [q] = await db
      .insert(blog)
      .values({
        id: crypto.randomUUID(),
        slug: blogId.toLowerCase(),
        userId: user.id,
        updated: new Date(),
      })
      .returning();

    return { blogId: q.slug };
  } catch (e) {
    return { error: "알 수 없는 오류가 발생했습니다." };
  }
}

export async function deleteBlog(blogId: string) {
  const { user } = await getCurrentSession();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogId),
    with: {
      user: true,
    },
  });

  if (!targetBlog) {
    return { error: "블로그를 찾을 수 없습니다." };
  }

  if (targetBlog.user.email !== user.email) {
    return { error: "권한이 없습니다." };
  }

  await db.delete(blog).where(eq(blog.slug, blogId));

  return {
    success: true,
  };
}

async function assertCurrentUserHasBlogWithIdAndPostWithId(
  blogId: string,
  postId: string
) {
  const { user: sessionUser } = await getCurrentSession();
  if (!sessionUser) {
    throw new Error("사용자가 없습니다.");
  }

  const targetPost = await db.query.post.findFirst({
    where: and(eq(post.id, postId), isNull(post.deleted)),
    with: {
      blog: true,
    },
  });

  if (!targetPost) {
    throw new Error("글을 찾을 수 없습니다.");
  }

  if (targetPost.blog.userId !== sessionUser.id) {
    throw new Error("권한이 없습니다.");
  }

  return targetPost;
}

export async function publishPost(blogId: string, postId: string) {
  const uuid = decodePostId(postId);
  await assertCurrentUserHasBlogWithIdAndPostWithId(blogId, uuid);

  await db
    .update(post)
    .set({
      published: new Date(),
    })
    .where(eq(post.id, uuid));

  return {
    success: true,
  };
}

export async function unPublishPost(blogId: string, postId: string) {
  const uuid = decodePostId(postId);
  await assertCurrentUserHasBlogWithIdAndPostWithId(blogId, uuid);

  await db
    .update(post)
    .set({
      published: null,
    })
    .where(eq(post.id, uuid));

  return {
    success: true,
  };
}

export async function deletePost(blogId: string, postId: string) {
  const uuid = decodePostId(postId);
  await assertCurrentUserHasBlogWithIdAndPostWithId(blogId, uuid);

  await db
    .update(post)
    .set({
      title: null,
      content: null,
      deleted: new Date(),
    })
    .where(eq(post.id, uuid));

  return {
    success: true,
  };
}

export async function upsertPost(
  blogSlug: string,
  published: Date | null,
  postId: string | null,
  title: string,
  content: string
) {
  const { user } = await getCurrentSession();
  if (!user) {
    throw new Error("사용자가 없습니다.");
  }

  const targetBlog = await db.query.blog.findFirst({
    where: and(eq(blog.slug, blogSlug), eq(blog.userId, user.id)),
  });

  if (!targetBlog) {
    throw new Error("블로그를 찾을 수 없습니다.");
  }

  const uuid = postId ? decodePostId(postId) : undefined;

  let targetPost;
  let wasAlreadyPublished = false;

  if (uuid) {
    const existingPost = await db.query.post.findFirst({
      where: eq(post.id, uuid),
    });
    wasAlreadyPublished = !!existingPost?.published;

    const [updatedPost] = await db
      .update(post)
      .set({
        title,
        content,
        published,
      })
      .where(eq(post.id, uuid))
      .returning();
    targetPost = updatedPost;
  } else {
    const [newPost] = await db
      .insert(post)
      .values({
        title,
        content,
        published,
        blogId: targetBlog.id,
        updated: new Date(),
        id: crypto.randomUUID(),
      })
      .returning();
    targetPost = newPost;
  }

  // Email sending is now manual - no automatic email on publish

  revalidatePath(`/@${blogSlug}`);

  return {
    success: true,
    postId: encodePostId(targetPost.id),
  };
}

export async function editBlogInfo(
  blogSlug: string,
  name: string,
  description: string,
  discoverable: boolean
) {
  const { user } = await getCurrentSession();
  if (!user) {
    throw new Error("사용자가 없습니다.");
  }

  const targetBlog = await db.query.blog.findFirst({
    where: and(eq(blog.slug, blogSlug), eq(blog.userId, user.id)),
  });

  if (!targetBlog) {
    throw new Error("블로그를 찾을 수 없습니다.");
  }

  await db
    .update(blog)
    .set({
      name,
      description,
      discoverable,
    })
    .where(eq(blog.id, targetBlog.id));

  return {
    success: true,
  };
}

export async function sendPostEmail(blogId: string, postId: string) {
  const uuid = decodePostId(postId);
  await assertCurrentUserHasBlogWithIdAndPostWithId(blogId, uuid);

  const foundBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogId),
  });

  if (!foundBlog) {
    return { success: false, message: "블로그를 찾을 수 없습니다." };
  }

  console.log({ foundBlog });

  try {
    const { emailQueue } = await import("../queue/email-queue");

    const jobId = await emailQueue.enqueue({
      blogId: foundBlog.id,
      postId: uuid,
      type: "post-notification",
      maxRetries: 3,
    });

    return {
      success: true,
      message: "이메일 발송이 예약되었습니다.",
      jobId,
    };
  } catch (error) {
    console.error("Failed to enqueue notification email:", error);
    return {
      success: false,
      message: "이메일 발송 예약 중 오류가 발생했습니다.",
    };
  }
}
