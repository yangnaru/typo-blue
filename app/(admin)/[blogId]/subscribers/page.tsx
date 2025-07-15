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
import { eq } from "drizzle-orm";
import { blog, mailingListSubscription } from "@/drizzle/schema";
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

  const subscribers = await db.query.mailingListSubscription.findMany({
    where: eq(mailingListSubscription.blogId, currentBlog.id),
    orderBy: (mailingListSubscription, { desc }) => [desc(mailingListSubscription.created)],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>메일링 리스트 구독자</CardTitle>
        <CardDescription>
          {currentBlog.name || `@${currentBlog.slug}`} 블로그의 구독자 목록입니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {subscribers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            아직 구독자가 없습니다.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이메일</TableHead>
                <TableHead className="hidden md:table-cell">구독 일시</TableHead>
                <TableHead className="hidden sm:table-cell">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.map((subscriber) => (
                <TableRow key={subscriber.id}>
                  <TableCell className="font-medium">
                    {subscriber.email}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatInTimeZone(
                      subscriber.created,
                      "Asia/Seoul",
                      "yyyy-MM-dd HH:mm"
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="default" className="text-xs">
                      활성
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="mt-4 text-sm text-muted-foreground">
          총 {subscribers.length}명의 구독자
        </div>
      </CardContent>
    </Card>
  );
}