"use server";

import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  actorTable,
  blog,
  notificationTable,
  postTable,
} from "@/drizzle/schema";
import { eq, and, inArray, isNull, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function markNotificationAsRead(
  blogSlug: string,
  notificationId: string
) {
  const { user } = await getCurrentSession();
  if (!user) {
    throw new Error("사용자가 없습니다.");
  }

  // Get the blog and verify ownership
  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogSlug),
  });

  if (!targetBlog || targetBlog.userId !== user.id) {
    throw new Error("권한이 없습니다.");
  }

  // Update the notification
  await db
    .update(notificationTable)
    .set({
      read: new Date(),
      updated: new Date(),
    })
    .where(and(eq(notificationTable.id, notificationId)));

  revalidatePath(`/@${blogSlug}/notifications`);

  return { success: true };
}

export async function markAllNotificationsAsRead(blogSlug: string) {
  const { user } = await getCurrentSession();
  if (!user) {
    throw new Error("사용자가 없습니다.");
  }

  // Get the blog and verify ownership
  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogSlug),
  });

  if (!targetBlog || targetBlog.userId !== user.id) {
    throw new Error("권한이 없습니다.");
  }

  // Update all unread notifications for this blog
  // There is no blogId column, so we update notifications whose postId belongs to this blog
  const blogPostIds = (
    await db.query.postTable.findMany({
      columns: { id: true },
      where: eq(postTable.blogId, targetBlog.id),
    })
  ).map((post) => post.id);

  if (blogPostIds.length > 0) {
    await db
      .update(notificationTable)
      .set({
        read: new Date(),
        updated: new Date(),
      })
      .where(
        and(
          inArray(notificationTable.postId, blogPostIds),
          isNull(notificationTable.read)
        )
      );
  }

  revalidatePath(`/@${blogSlug}/notifications`);

  return { success: true };
}

export async function deleteNotification(
  blogSlug: string,
  notificationId: string
) {
  const { user } = await getCurrentSession();
  if (!user) {
    throw new Error("사용자가 없습니다.");
  }

  // Get the blog and verify ownership
  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogSlug),
  });

  if (!targetBlog || targetBlog.userId !== user.id) {
    throw new Error("권한이 없습니다.");
  }

  // Delete the notification
  await db
    .delete(notificationTable)
    .where(eq(notificationTable.id, notificationId));

  revalidatePath(`/@${blogSlug}/notifications`);

  return { success: true };
}

export async function getUnreadNotificationCount(blogSlug: string): Promise<number> {
  const { user } = await getCurrentSession();
  if (!user) {
    return 0;
  }

  // Get the blog and verify ownership
  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogSlug),
  });

  if (!targetBlog || targetBlog.userId !== user.id) {
    return 0;
  }

  // Get all post IDs for this blog
  const blogPostIds = (
    await db.query.postTable.findMany({
      columns: { id: true },
      where: eq(postTable.blogId, targetBlog.id),
    })
  ).map((post) => post.id);

  if (blogPostIds.length === 0) {
    return 0;
  }

  // Count unread notifications for posts in this blog
  const result = await db
    .select({ count: count() })
    .from(notificationTable)
    .where(
      and(
        inArray(notificationTable.postId, blogPostIds),
        isNull(notificationTable.read)
      )
    );

  return result[0]?.count || 0;
}
