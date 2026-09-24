"use server";

import { db } from "@/lib/db";
import { mailingListSubscription, blog } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { generateRandomString, alphabet } from "oslo/crypto";

export async function subscribeToMailingList(
  email: string,
  blogId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const targetBlog = await db.query.blog.findFirst({
      where: eq(blog.id, blogId),
    });

    if (!targetBlog) {
      return { success: false, message: "블로그를 찾을 수 없습니다." };
    }

    const existingSubscription = await db
      .select()
      .from(mailingListSubscription)
      .where(
        and(
          eq(mailingListSubscription.email, email),
          eq(mailingListSubscription.blogId, blogId)
        )
      );

    // Only insert if not already subscribed, but always return success
    if (existingSubscription.length === 0) {
      const unsubscribeToken = generateRandomString(
        32,
        alphabet("a-z", "A-Z", "0-9")
      );

      await db.insert(mailingListSubscription).values({
        id: randomUUID(),
        email,
        blogId,
        unsubscribeToken,
      });
    }

    // Always return the same success message regardless of subscription status
    return { success: true, message: "구독 요청이 처리되었습니다." };
  } catch (error) {
    console.error("Error subscribing to mailing list:", error);
    return { success: false, message: "구독 중 오류가 발생했습니다." };
  }
}

export async function unsubscribeFromMailingList(
  token: string
): Promise<{ success: boolean; message: string }> {
  try {
    const subscription = await db
      .select()
      .from(mailingListSubscription)
      .where(eq(mailingListSubscription.unsubscribeToken, token));

    if (subscription.length === 0) {
      return { success: false, message: "유효하지 않은 구독해지 링크입니다." };
    }

    await db
      .delete(mailingListSubscription)
      .where(eq(mailingListSubscription.unsubscribeToken, token));

    return { success: true, message: "메일링 리스트 구독이 해지되었습니다." };
  } catch (error) {
    console.error("Error unsubscribing from mailing list:", error);
    return { success: false, message: "구독해지 중 오류가 발생했습니다." };
  }
}
