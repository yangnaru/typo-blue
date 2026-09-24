import { formatInTimeZone } from "date-fns-tz";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { and, count, eq, isNotNull, isNull, sql, desc } from "drizzle-orm";
import { blog, mailingListSubscription, emailQueue } from "@/drizzle/schema";
import { getRootPath } from "@/lib/paths";
import { redirect } from "next/navigation";

type PageProps = Promise<{
  blogId: string;
}>;

export default async function SubscribersPage(props: { params: PageProps }) {
  const { blogId } = await props.params;

  const { user: sessionUser } = await getCurrentSession();

  const decodedBlogId = decodeURIComponent(blogId);
  const slug = decodedBlogId.replace("@", "");

  const currentBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, slug),
  });

  if (!currentBlog) {
    redirect(getRootPath());
  }

  if (!sessionUser || sessionUser.id !== currentBlog?.userId) {
    redirect(getRootPath());
  }

  // Get subscribers with email statistics
  const subscribers = await db
    .select({
      id: mailingListSubscription.id,
      email: mailingListSubscription.email,
      created: mailingListSubscription.created,
      emailsSent: sql<number>`COALESCE(COUNT(${emailQueue.id}), 0)`,
      emailsDelivered: sql<number>`COALESCE(SUM(CASE WHEN ${emailQueue.status} = 'completed' THEN 1 ELSE 0 END), 0)`,
      emailsOpened: sql<number>`COALESCE(SUM(CASE WHEN ${emailQueue.openedAt} IS NOT NULL THEN 1 ELSE 0 END), 0)`,
      emailsFailed: sql<number>`COALESCE(SUM(CASE WHEN ${emailQueue.status} = 'failed' THEN 1 ELSE 0 END), 0)`,
      lastEmailSent: sql<Date | null>`MAX(${emailQueue.sentAt})`,
    })
    .from(mailingListSubscription)
    .leftJoin(
      emailQueue,
      sql`${emailQueue.subscriberEmail} = ${mailingListSubscription.email} AND ${emailQueue.blogId} = ${currentBlog.id}`
    )
    .where(
      and(
        eq(mailingListSubscription.blogId, currentBlog.id),
        isNotNull(mailingListSubscription.confirmedAt)
      )
    )
    .groupBy(mailingListSubscription.id)
    .orderBy(desc(mailingListSubscription.created));

  // Signed up but not confirmed yet; they get no posts until they confirm
  const [{ pendingSubscribers }] = await db
    .select({ pendingSubscribers: count() })
    .from(mailingListSubscription)
    .where(
      and(
        eq(mailingListSubscription.blogId, currentBlog.id),
        isNull(mailingListSubscription.confirmedAt)
      )
    );

  // Get overview statistics
  const totalSubscribers = subscribers.length;
  const totalEmailsSent = subscribers.reduce(
    (sum, s) => sum + Number(s.emailsSent),
    0
  );
  const totalEmailsOpened = subscribers.reduce(
    (sum, s) => sum + Number(s.emailsOpened),
    0
  );
  const openRate =
    totalEmailsSent > 0
      ? Math.round((totalEmailsOpened / totalEmailsSent) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <h3 className="text-xl">구독자</h3>
      <p className="text-neutral-500">
        구독자 {totalSubscribers}명
        {pendingSubscribers > 0 && ` (확인 대기 ${pendingSubscribers}명)`} ·
        발송 {totalEmailsSent}통 · 열람률 {openRate}%
      </p>

      {subscribers.length === 0 ? (
        <p>아직 구독자가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {subscribers.map((subscriber) => (
            <li key={subscriber.id} className="break-all">
              <span className="font-bold tabular-nums">
                {formatInTimeZone(
                  subscriber.created,
                  "Asia/Seoul",
                  "yyyy-MM-dd"
                )}
              </span>{" "}
              {subscriber.email}
              <p className="text-neutral-500 text-sm">
                발송 {subscriber.emailsSent} · 열람 {subscriber.emailsOpened}
                {Number(subscriber.emailsFailed) > 0 && (
                  <span className="text-red-500">
                    {" "}
                    · 실패 {subscriber.emailsFailed}
                  </span>
                )}
                {subscriber.lastEmailSent &&
                  ` · 마지막 발송 ${formatInTimeZone(
                    subscriber.lastEmailSent,
                    "Asia/Seoul",
                    "yyyy-MM-dd HH:mm"
                  )}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
