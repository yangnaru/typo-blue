"use server";

import { db } from "@/lib/db";
import {
  mailingListSubscription,
  postEmailSent,
  blog,
  post,
} from "@/drizzle/schema";
import { eq, and, isNotNull, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { generateRandomString, alphabet } from "oslo/crypto";
import { MailgunTransport } from "@upyo/mailgun";
import { createMessage } from "@upyo/core";
import { htmlToText } from "html-to-text";

export async function subscribeToMailingList(
  email: string,
  blogId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const existingSubscription = await db
      .select()
      .from(mailingListSubscription)
      .where(
        and(
          eq(mailingListSubscription.email, email),
          eq(mailingListSubscription.blogId, blogId)
        )
      );

    if (existingSubscription.length > 0) {
      return { success: false, message: "이미 구독하고 있습니다." };
    }

    const targetBlog = await db.query.blog.findFirst({
      where: eq(blog.id, blogId),
    });

    if (!targetBlog) {
      return { success: false, message: "블로그를 찾을 수 없습니다." };
    }

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

    return { success: true, message: "메일링 리스트 구독이 완료되었습니다." };
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

export async function sendPostNotificationEmail(
  postId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const alreadySent = await db
      .select()
      .from(postEmailSent)
      .where(eq(postEmailSent.postId, postId));

    if (alreadySent.length > 0) {
      return { success: false, message: "이미 이메일이 발송되었습니다." };
    }

    const postData = await db.query.post.findFirst({
      where: and(
        eq(post.id, postId),
        isNotNull(post.published),
        isNull(post.deleted)
      ),
      with: {
        blog: {
          with: {
            user: true,
          },
        },
      },
    });

    if (!postData) {
      return { success: false, message: "게시글을 찾을 수 없습니다." };
    }

    const subscribers = await db
      .select()
      .from(mailingListSubscription)
      .where(eq(mailingListSubscription.blogId, postData.blogId));

    if (subscribers.length === 0) {
      return { success: true, message: "구독자가 없습니다." };
    }

    const transport = new MailgunTransport({
      apiKey: process.env.MAILGUN_API_KEY!,
      domain: process.env.MAILGUN_DOMAIN!,
    });

    const blogName = postData.blog.name || `@${postData.blog.slug}`;
    const postUrl = `${process.env.NEXT_PUBLIC_URL}/@${postData.blog.slug}/${postData.id}`;
    const contentText = postData.content ? htmlToText(postData.content) : "";

    for (const subscriber of subscribers) {
      const unsubscribeUrl = `${process.env.NEXT_PUBLIC_URL}/unsubscribe?token=${subscriber.unsubscribeToken}`;

      const emailContent = `
새로운 글이 게시되었습니다.

제목: ${postData.title}
블로그: ${blogName}
작성자: ${postData.blog.user.name}

${contentText.substring(0, 200)}${contentText.length > 200 ? "..." : ""}

전체 글 보기: ${postUrl}

---
이 메일은 ${blogName} 블로그의 메일링 리스트에 구독하여 발송되었습니다.
구독해지: ${unsubscribeUrl}
      `.trim();

      const message = createMessage({
        from: process.env.EMAIL_FROM!,
        to: subscriber.email,
        subject: `[${blogName}] ${postData.title}`,
        content: { text: emailContent },
      });

      try {
        const receipt = await transport.send(message);
        if (receipt.successful) {
          console.log(
            `Email sent to ${subscriber.email}, ID: ${receipt.messageId}`
          );
        } else {
          console.error(
            `Failed to send to ${subscriber.email}:`,
            receipt.errorMessages.join(", ")
          );
        }
      } catch (error) {
        console.error(`Error sending email to ${subscriber.email}:`, error);
      }
    }

    await db.insert(postEmailSent).values({
      id: randomUUID(),
      postId,
    });

    return {
      success: true,
      message: `${subscribers.length}명의 구독자에게 이메일을 발송했습니다.`,
    };
  } catch (error) {
    console.error("Error sending post notification email:", error);
    return { success: false, message: "이메일 발송 중 오류가 발생했습니다." };
  }
}
