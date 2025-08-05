import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import formatInTimeZone from "date-fns-tz/formatInTimeZone";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, sql, desc } from "drizzle-orm";
import { blog, mailingListSubscription, emailQueue } from "@/drizzle/schema";
import { getRootPath } from "@/lib/paths";
import { redirect } from "next/navigation";
import {
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  TrendingUp,
  Calendar,
} from "lucide-react";

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
      emailsFailed: sql<number>`COALESCE(SUM(CASE WHEN ${emailQueue.status} = 'failed' THEN 1 ELSE 0 END), 0)`,
      lastEmailSent: sql<Date | null>`MAX(${emailQueue.sentAt})`,
    })
    .from(mailingListSubscription)
    .leftJoin(
      emailQueue,
      sql`${emailQueue.subscriberEmail} = ${mailingListSubscription.email} AND ${emailQueue.blogId} = ${currentBlog.id}`
    )
    .where(eq(mailingListSubscription.blogId, currentBlog.id))
    .groupBy(mailingListSubscription.id)
    .orderBy(desc(mailingListSubscription.created));

  // Get overview statistics
  const totalSubscribers = subscribers.length;
  const totalEmailsSent = subscribers.reduce(
    (sum, s) => sum + Number(s.emailsSent),
    0
  );
  const totalEmailsDelivered = subscribers.reduce(
    (sum, s) => sum + Number(s.emailsDelivered),
    0
  );
  const deliveryRate =
    totalEmailsSent > 0
      ? Math.round((totalEmailsDelivered / totalEmailsSent) * 100)
      : 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">메일링 리스트</h1>
        <p className="text-muted-foreground">
          메일링 리스트 구독자와 이메일 통계
        </p>
      </div>

      {/* Overview Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div className="text-sm font-medium text-muted-foreground">
                구독자
              </div>
            </div>
            <div className="text-2xl font-bold mt-1">{totalSubscribers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-green-500" />
              <div className="text-sm font-medium text-muted-foreground">
                발송
              </div>
            </div>
            <div className="text-2xl font-bold mt-1">{totalEmailsSent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <div className="text-sm font-medium text-muted-foreground">
                전달
              </div>
            </div>
            <div className="text-2xl font-bold mt-1">
              {totalEmailsDelivered}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <div className="text-sm font-medium text-muted-foreground">
                전달률
              </div>
            </div>
            <div className="text-2xl font-bold mt-1">{deliveryRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Subscribers Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">구독자 목록</CardTitle>
          <CardDescription>
            {currentBlog.name || `@${currentBlog.slug}`} 블로그의 구독자들과
            이메일 통계
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {subscribers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              아직 구독자가 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="px-6">구독자</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">
                    발송
                  </TableHead>
                  <TableHead className="hidden sm:table-cell text-center">
                    전달
                  </TableHead>
                  <TableHead className="hidden md:table-cell text-center">
                    실패
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    마지막 이메일
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">구독일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map((subscriber) => (
                  <TableRow key={subscriber.id} className="hover:bg-muted/50">
                    <TableCell className="px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                        <span className="font-medium truncate">
                          {subscriber.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {subscriber.emailsSent}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center">
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-sm font-medium">
                          {subscriber.emailsDelivered}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-center">
                      <div className="flex items-center justify-center gap-1">
                        {Number(subscriber.emailsFailed) > 0 ? (
                          <>
                            <XCircle className="h-3 w-3 text-red-500" />
                            <span className="text-sm font-medium text-red-600">
                              {subscriber.emailsFailed}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            0
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        {subscriber.lastEmailSent ? (
                          <>
                            <Clock className="h-3 w-3" />
                            {formatInTimeZone(
                              subscriber.lastEmailSent,
                              "Asia/Seoul",
                              "MM/dd HH:mm"
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatInTimeZone(
                          subscriber.created,
                          "Asia/Seoul",
                          "MM/dd"
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
