import { formatInTimeZone } from "date-fns-tz";
import { assertAdmin } from "@/lib/server-util";
import { db } from "@/lib/db";
import { emailQueue } from "@/drizzle/schema";
import { desc, sql } from "drizzle-orm";

export default async function EmailQueuePage() {
  await assertAdmin();

  const counts = await db
    .select({
      status: emailQueue.status,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(emailQueue)
    .groupBy(emailQueue.status);
  const byStatus = Object.fromEntries(counts.map((r) => [r.status, r.count]));

  const recentFailures = await db
    .select({
      id: emailQueue.id,
      subscriberEmail: emailQueue.subscriberEmail,
      type: emailQueue.type,
      retryCount: emailQueue.retryCount,
      maxRetries: emailQueue.maxRetries,
      errorMessage: emailQueue.errorMessage,
      createdAt: emailQueue.createdAt,
    })
    .from(emailQueue)
    .where(sql`${emailQueue.status} = 'failed'`)
    .orderBy(desc(emailQueue.createdAt))
    .limit(20);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h3 className="text-xl">이메일 큐</h3>
        <p>
          대기 {byStatus.pending ?? 0} · 처리 중 {byStatus.processing ?? 0} ·
          완료 {byStatus.completed ?? 0} ·{" "}
          <span className={byStatus.failed ? "text-red-500" : undefined}>
            실패 {byStatus.failed ?? 0}
          </span>
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg">최근 실패 20건</h3>
        {recentFailures.length === 0 ? (
          <p className="text-neutral-500">실패한 항목이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {recentFailures.map((row) => (
              <li key={row.id} className="break-all">
                <span className="font-bold tabular-nums">
                  {formatInTimeZone(row.createdAt, "Asia/Seoul", "yyyy-MM-dd HH:mm")}
                </span>{" "}
                {row.subscriberEmail}
                <p className="text-neutral-500 text-sm">
                  {row.type} · 재시도 {row.retryCount}/{row.maxRetries}
                </p>
                {row.errorMessage && (
                  <p className="text-red-500 text-sm line-clamp-2">
                    {row.errorMessage}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
