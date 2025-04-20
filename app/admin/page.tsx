import { assertAdmin } from "@/lib/server-util";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ImpersonateButton from "./impersonate-button";
import Link from "next/link";
import { encodePostId } from "@/lib/utils";
import { and, desc, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { blog, post } from "@/drizzle/schema";

export default async function AdminRootPage() {
  await assertAdmin();

  const blogs = await db.query.blog.findMany({
    with: {
      posts: {
        where: and(isNotNull(post.published), isNull(post.deleted)),
        orderBy: desc(post.published),
      },
    },
  });

  return (
    <div>
      <Table>
        <TableCaption>블로그 목록</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>최근 글</TableHead>
            <TableHead>흉내내기</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {blogs.map((blog) => {
            const encodedLatestPostId = blog.posts[0]
              ? encodePostId(blog.posts[0].id)
              : "";

            return (
              <TableRow key={blog.id}>
                <TableCell>{blog.slug}</TableCell>
                <TableCell>
                  {blog.posts[0] ? (
                    <Link href={`/@${blog.slug}/${encodedLatestPostId}`}>
                      {blog.posts[0].title || "무제"}
                    </Link>
                  ) : (
                    "글 없음"
                  )}
                </TableCell>
                <TableCell>
                  <ImpersonateButton userId={blog.userId} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
