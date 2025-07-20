"use server";

import { db } from "@/lib/db";
import { mailingListSubscription, blog, post } from "@/drizzle/schema";
import { eq, and, isNotNull, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { generateRandomString, alphabet } from "oslo/crypto";
import { MailgunTransport } from "@upyo/mailgun";
import { createMessage } from "@upyo/core";
import { htmlToText } from "html-to-text";
import { encodePostId } from "../utils";

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
  blogId: string,
  postId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const postData = await db.query.post.findFirst({
      where: and(
        eq(post.id, postId),
        eq(post.blogId, blogId),
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

    if (postData.emailSent) {
      return { success: false, message: "이미 이메일이 발송되었습니다." };
    }

    const subscribers = await db
      .select()
      .from(mailingListSubscription)
      .where(eq(mailingListSubscription.blogId, blogId));

    if (subscribers.length === 0) {
      return { success: true, message: "구독자가 없습니다." };
    }

    const transport = new MailgunTransport({
      apiKey: process.env.MAILGUN_API_KEY!,
      domain: process.env.MAILGUN_DOMAIN!,
    });

    const blogName = postData.blog.name || `@${postData.blog.slug}`;
    const postUrl = `${process.env.NEXT_PUBLIC_URL}/@${
      postData.blog.slug
    }/${encodePostId(postData.id)}`;
    const contentText = postData.content ? htmlToText(postData.content) : "";

    for (const subscriber of subscribers) {
      const unsubscribeUrl = `${process.env.NEXT_PUBLIC_URL}/unsubscribe?token=${subscriber.unsubscribeToken}`;

      const emailContentText = `
새로운 글이 게시되었습니다.

제목: ${postData.title}
블로그: ${blogName}

${contentText.substring(0, 200)}${contentText.length > 200 ? "..." : ""}

전체 글 보기: ${postUrl}

---
이 메일은 ${blogName} 블로그의 메일링 리스트에 구독하여 발송되었습니다.
구독해지: ${unsubscribeUrl}
      `.trim();

      const emailContentHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${postData.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
    }
    .header {
      border-bottom: 2px solid #e5e5e5;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 10px;
      line-height: 1.3;
    }
    .meta {
      color: #666;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .content {
      margin-bottom: 30px;
      padding: 20px;
      background-color: #f8f9fa;
      border-radius: 8px;
    }
    .cta {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #3b82f6;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
    }
    .button:hover {
      background-color: #2563eb;
    }
    .footer {
      border-top: 1px solid #e5e5e5;
      padding-top: 20px;
      margin-top: 40px;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    .unsubscribe {
      font-size: 12px;
      color: #666;
      text-decoration: none;
    }
    .unsubscribe:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${postData.title}</div>
    <div class="meta">
      <strong>${blogName}</strong>
    </div>
  </div>
  
  <div class="content">
    ${
      postData.content
        ? postData.content.substring(0, 300) +
          (postData.content.length > 300 ? "..." : "")
        : ""
    }
  </div>
  
  <div class="cta">
    <a href="${postUrl}" class="button">전체 글 보기</a>
  </div>
  
  <div class="footer">
    <p>이 메일은 <strong>${blogName}</strong> 블로그의 메일링 리스트에 구독하여 발송되었습니다.</p>
    <p><a href="${unsubscribeUrl}" class="unsubscribe">구독해지</a></p>
  </div>
</body>
</html>
      `.trim();

      const message = createMessage({
        from: process.env.EMAIL_FROM!,
        to: subscriber.email,
        subject: `[${blogName}] ${postData.title}`,
        content: {
          text: emailContentText,
          html: emailContentHtml,
        },
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

    await db
      .update(post)
      .set({ emailSent: new Date() })
      .where(eq(post.id, postId));

    return {
      success: true,
      message: `${subscribers.length}명의 구독자에게 이메일을 발송했습니다.`,
    };
  } catch (error) {
    console.error("Error sending post notification email:", error);
    return { success: false, message: "이메일 발송 중 오류가 발생했습니다." };
  }
}
