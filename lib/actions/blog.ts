"use server";

import { getCurrentSession } from "../auth";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { blog, postTable } from "@/drizzle/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { sendNoteToFollowers, sendActorUpdateToFollowers } from "../federation";

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

  if (targetBlog.user.id !== user.id) {
    return { error: "권한이 없습니다." };
  }

  // Disable federation before deleting the blog
  try {
    const { disableFederationForBlog } = await import("./activitypub");
    const federationResult = await disableFederationForBlog(blogId);

    if (!federationResult.success) {
      console.error(
        "Failed to disable federation during blog deletion:",
        federationResult.error
      );
      // Continue with blog deletion even if federation cleanup fails
    }
  } catch (error) {
    console.error("Error during federation cleanup:", error);
    // Continue with blog deletion even if federation cleanup fails
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

  const targetPost = await db.query.postTable.findFirst({
    where: and(eq(postTable.id, postId), isNull(postTable.deleted)),
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

export async function unPublishPost(blogId: string, postId: string) {
  const uuid = postId;
  await assertCurrentUserHasBlogWithIdAndPostWithId(blogId, uuid);

  await db
    .update(postTable)
    .set({
      published: null,
    })
    .where(eq(postTable.id, uuid));

  try {
    await sendNoteToFollowers(blogId, uuid, true);
  } catch (error) {
    console.error("Failed to send ActivityPub delete:", error);
  }

  return {
    success: true,
  };
}

export async function deletePost(blogId: string, postId: string) {
  const uuid = postId;
  await assertCurrentUserHasBlogWithIdAndPostWithId(blogId, uuid);

  await db
    .update(postTable)
    .set({
      title: null,
      content: null,
      deleted: new Date(),
    })
    .where(eq(postTable.id, uuid));

  try {
    await sendNoteToFollowers(blogId, uuid, true);
  } catch (error) {
    console.error("Failed to send ActivityPub delete:", error);
  }

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

  const uuid = postId;

  let targetPost;
  let wasAlreadyPublished = false;

  if (uuid) {
    const existingPost = await db.query.postTable.findFirst({
      where: eq(postTable.id, uuid),
    });
    wasAlreadyPublished = !!existingPost?.published;

    const updateData: {
      title: string;
      content: string;
      published: Date | null;
      updated: Date;
      first_published?: Date;
    } = {
      title,
      content,
      published: wasAlreadyPublished && published ? new Date() : published,
      updated: new Date(),
    };

    if (published && !existingPost?.first_published) {
      updateData.first_published = published;
    }

    const [updatedPost] = await db
      .update(postTable)
      .set(updateData)
      .where(eq(postTable.id, uuid))
      .returning();
    targetPost = updatedPost;
  } else {
    const insertData: {
      title: string;
      content: string;
      published: Date | null;
      blogId: string;
      updated: Date;
      id: string;
      first_published?: Date;
    } = {
      title,
      content,
      published,
      blogId: targetBlog.id,
      updated: new Date(),
      id: crypto.randomUUID(),
    };

    if (published) {
      insertData.first_published = published;
    }

    const [newPost] = await db.insert(postTable).values(insertData).returning();
    targetPost = newPost;
  }

  // Email sending is now manual - no automatic email on publish

  // Send to ActivityPub followers if this is a newly published post or an update to an already published post
  if (published && targetPost.title && targetPost.content) {
    try {
      await sendNoteToFollowers(
        blogSlug,
        targetPost.id,
        false,
        wasAlreadyPublished
      );
    } catch (error) {
      console.error("Failed to send ActivityPub article:", error);
    }
  }

  revalidatePath(`/@${blogSlug}`);

  return {
    success: true,
    postId: targetPost.id,
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

  // Send ActivityPub Update activity to followers if the blog has an actor
  try {
    await sendActorUpdateToFollowers(blogSlug, name, description);
  } catch (error) {
    console.error("Failed to send ActivityPub update:", error);
    // Don't fail the entire operation if ActivityPub update fails
  }

  return {
    success: true,
  };
}

export async function sendPostEmail(blogId: string, postId: string) {
  const uuid = postId;
  await assertCurrentUserHasBlogWithIdAndPostWithId(blogId, uuid);

  const foundBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogId),
  });

  if (!foundBlog) {
    return { success: false, message: "블로그를 찾을 수 없습니다." };
  }

  try {
    const { sendPostNotificationEmail } = await import("./mailing-list");

    return await sendPostNotificationEmail(foundBlog.id, uuid);
  } catch (error) {
    console.error("Failed to enqueue notification email:", error);
    return {
      success: false,
      message: "이메일 발송 예약 중 오류가 발생했습니다.",
    };
  }
}

export async function incrementVisitorCount(blogId: string) {
  await db
    .update(blog)
    .set({
      visitor_count: sql`${blog.visitor_count} + 1`,
    })
    .where(eq(blog.id, blogId));
}
