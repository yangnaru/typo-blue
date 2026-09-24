import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mailingListSubscription } from "@/drizzle/schema";
import { sendMail } from "./send";
import { escapeHtml } from "../utils";

export function getSubscriptionConfirmUrl(token: string) {
  return `${process.env.NEXT_PUBLIC_URL}/subscribe/confirm?token=${encodeURIComponent(token)}`;
}

export function getUnsubscribeUrl(token: string) {
  return `${process.env.NEXT_PUBLIC_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
}

// For List-Unsubscribe; mail clients POST to it to unsubscribe in one click
export function getOneClickUnsubscribeUrl(token: string) {
  return `${process.env.NEXT_PUBLIC_URL}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}

// Asks the address's owner to confirm, so no one can subscribe others
export async function sendSubscriptionConfirmation(
  email: string,
  token: string,
  blogName: string
): Promise<boolean> {
  const confirmUrl = getSubscriptionConfirmUrl(token);

  return await sendMail({
    to: email,
    subject: `[${blogName}] 구독을 확인해 주세요`,
    text: `${blogName} 블로그의 메일링 리스트 구독을 요청하셨습니다.

아래 링크에서 구독을 확인해 주세요:
${confirmUrl}

직접 요청하지 않으셨다면 이 메일을 무시하세요. 확인하지 않으면 구독되지 않습니다.`,
    html: `<p><strong>${escapeHtml(blogName)}</strong> 블로그의 메일링 리스트 구독을 요청하셨습니다.</p>
<p><a href="${escapeHtml(confirmUrl)}">구독 확인하기</a></p>
<p>직접 요청하지 않으셨다면 이 메일을 무시하세요. 확인하지 않으면 구독되지 않습니다.</p>`,
  });
}

// Shared by the unsubscribe page and the one-click endpoint
export async function deleteSubscriptionByToken(token: string) {
  const deleted = await db
    .delete(mailingListSubscription)
    .where(eq(mailingListSubscription.unsubscribeToken, token))
    .returning({ id: mailingListSubscription.id });
  return deleted.length > 0;
}
