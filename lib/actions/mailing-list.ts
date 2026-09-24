"use server";

import { db } from "@/lib/db";
import { mailingListSubscription, blog } from "@/drizzle/schema";
import { eq, and, isNull, lt } from "drizzle-orm";
import { randomUUID } from "crypto";
import { generateRandomString, alphabet } from "oslo/crypto";
import { isValidEmail, normalizeEmail } from "../utils";
import {
  deleteSubscriptionByToken,
  sendSubscriptionConfirmation,
} from "../email/subscription";

// Don't send another confirmation to an address sooner than this, so the
// form can't be used to flood someone's inbox
const CONFIRMATION_RESEND_INTERVAL_MS = 1000 * 60 * 60;
// Unconfirmed subscriptions older than this are dropped
const UNCONFIRMED_LIFETIME_MS = 1000 * 60 * 60 * 24 * 7;

export async function subscribeToMailingList(
  rawEmail: string,
  blogId: string
): Promise<{ success: boolean; message: string }> {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) {
    return { success: false, message: "올바른 이메일 주소가 아닙니다." };
  }

  try {
    const targetBlog = await db.query.blog.findFirst({
      where: eq(blog.id, blogId),
    });

    if (!targetBlog) {
      return { success: false, message: "블로그를 찾을 수 없습니다." };
    }

    await db
      .delete(mailingListSubscription)
      .where(
        and(
          isNull(mailingListSubscription.confirmedAt),
          lt(
            mailingListSubscription.created,
            new Date(Date.now() - UNCONFIRMED_LIFETIME_MS)
          )
        )
      );

    let [subscription] = await db
      .select()
      .from(mailingListSubscription)
      .where(
        and(
          eq(mailingListSubscription.email, email),
          eq(mailingListSubscription.blogId, blogId)
        )
      );

    if (!subscription) {
      [subscription] = await db
        .insert(mailingListSubscription)
        .values({
          id: randomUUID(),
          email,
          blogId,
          unsubscribeToken: generateRandomString(
            32,
            alphabet("a-z", "A-Z", "0-9")
          ),
        })
        .onConflictDoNothing()
        .returning();
    }

    // The same answer whether or not the address was already subscribed, so
    // the form doesn't tell who subscribes to what
    const message =
      "확인 메일을 보냈습니다. 메일의 링크를 눌러 구독을 완료해 주세요.";

    if (
      !subscription ||
      subscription.confirmedAt ||
      (subscription.confirmationSentAt &&
        Date.now() - subscription.confirmationSentAt.getTime() <
          CONFIRMATION_RESEND_INTERVAL_MS)
    ) {
      return { success: true, message };
    }

    await db
      .update(mailingListSubscription)
      .set({ confirmationSentAt: new Date() })
      .where(eq(mailingListSubscription.id, subscription.id));

    await sendSubscriptionConfirmation(
      email,
      subscription.unsubscribeToken,
      targetBlog.name || `@${targetBlog.slug}`
    );

    return { success: true, message };
  } catch (error) {
    console.error("Error subscribing to mailing list:", error);
    return { success: false, message: "구독 중 오류가 발생했습니다." };
  }
}

type TokenActionState = { done: boolean; message: string } | null;

// From the button on the confirmation page; a link alone doesn't confirm, as
// mail scanners open links
export async function confirmSubscription(
  _prevState: TokenActionState,
  formData: FormData
): Promise<TokenActionState> {
  const token = formData.get("token");
  if (typeof token !== "string") {
    return { done: false, message: "유효하지 않은 링크입니다." };
  }

  const [confirmed] = await db
    .update(mailingListSubscription)
    .set({ confirmedAt: new Date() })
    .where(
      and(
        eq(mailingListSubscription.unsubscribeToken, token),
        isNull(mailingListSubscription.confirmedAt)
      )
    )
    .returning({ id: mailingListSubscription.id });

  if (!confirmed) {
    const existing = await db.query.mailingListSubscription.findFirst({
      where: eq(mailingListSubscription.unsubscribeToken, token),
    });
    if (!existing) {
      return { done: false, message: "유효하지 않거나 만료된 링크입니다." };
    }
  }

  return { done: true, message: "구독이 확인되었습니다." };
}

// From the button on the unsubscribe page, for the same reason
export async function unsubscribeFromMailingList(
  _prevState: TokenActionState,
  formData: FormData
): Promise<TokenActionState> {
  const token = formData.get("token");
  if (typeof token !== "string") {
    return { done: false, message: "유효하지 않은 구독해지 링크입니다." };
  }

  try {
    if (!(await deleteSubscriptionByToken(token))) {
      return { done: false, message: "유효하지 않은 구독해지 링크입니다." };
    }
    return { done: true, message: "메일링 리스트 구독이 해지되었습니다." };
  } catch (error) {
    console.error("Error unsubscribing from mailing list:", error);
    return { done: false, message: "구독해지 중 오류가 발생했습니다." };
  }
}
