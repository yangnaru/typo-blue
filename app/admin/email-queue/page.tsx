import { assertAdmin } from "@/lib/server-util";
import { db } from "@/lib/db";
import { emailQueue } from "@/drizzle/schema";
import { desc, sql } from "drizzle-orm";
import Stat from "../stat";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">이메일 큐</h1>
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="대기 중" value={byStatus.pending ?? 0} />
        <Stat label="처리 중" value={byStatus.processing ?? 0} />
        <Stat label="완료" value={byStatus.completed ?? 0} />
        <Stat label="실패" value={byStatus.failed ?? 0} />
      </section>

      <section>
        <Table>
          <TableCaption>최근 실패 20건</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>수신자</TableHead>
              <TableHead>종류</TableHead>
              <TableHead>재시도</TableHead>
              <TableHead>오류</TableHead>
              <TableHead>생성일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentFailures.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  실패한 항목이 없습니다.
                </TableCell>
              </TableRow>
            )}
            {recentFailures.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.subscriberEmail}</TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell>
                  {row.retryCount} / {row.maxRetries}
                </TableCell>
                <TableCell className="max-w-md truncate">
                  {row.errorMessage ?? "-"}
                </TableCell>
                <TableCell>
                  {new Date(row.createdAt).toLocaleString("ko-KR")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
