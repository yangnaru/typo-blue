import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import Link from "next/link";
import {
  getBlogNewPostPath,
  getBlogPostEditPath,
  getBlogPostPath,
  getRootPath,
} from "@/lib/paths";
import { encodePostId } from "@/lib/utils";
import { redirect } from "next/navigation";
import { SquareArrowUpRight } from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { blog } from "@/drizzle/schema";

type PageProps = Promise<{
  blogId: string;
}>;

export default async function Dashboard(props: { params: PageProps }) {
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

  const currentBlogPosts = await db.query.post.findMany({
    where: eq(blog.id, currentBlog.id),
    orderBy: desc(blog.createdAt),
  });

  if (!sessionUser || sessionUser.id !== currentBlog?.userId) {
    redirect(getRootPath());
  }

  return (
    <Card x-chunk="dashboard-05-chunk-3">
      <CardHeader className="px-7">
        <CardTitle>글 목록</CardTitle>
        <CardDescription>발행 및 미발행된 글 목록.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>글 제목</TableHead>
              <TableHead className="hidden sm:table-cell">발행 상태</TableHead>
              <TableHead className="hidden md:table-cell">
                발행 일시 (또는 저장 일시)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentBlogPosts.map((post) => {
              return (
                <TableRow key={post.uuid} className="bg-accent">
                  <TableCell className="flex flex-row gap-2 items-center">
                    <Link
                      href={getBlogPostEditPath(slug, encodePostId(post.uuid))}
                    >
                      <span className="font-medium">
                        {post.title === "" ? "무제" : post.title}
                      </span>
                    </Link>
                    <Link
                      href={getBlogPostPath(slug, encodePostId(post.uuid))}
                      target="_blank"
                    >
                      <SquareArrowUpRight className="h-5 w-5" />
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {post.publishedAt ? (
                      <Badge className="text-xs" variant="default">
                        발행
                      </Badge>
                    ) : (
                      <Badge className="text-xs" variant="destructive">
                        미발행
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatInTimeZone(
                      post.publishedAt ?? post.updatedAt,
                      "Asia/Seoul",
                      "yyyy-MM-dd HH:mm"
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <Link href={getBlogNewPostPath(slug)}>
          <Button>새 글 작성</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
