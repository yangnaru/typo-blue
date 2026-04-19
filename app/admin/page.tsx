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
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  actorTable,
  blog,
  mailingListSubscription,
  postTable,
  session,
  user,
} from "@/drizzle/schema";
import { getBlogPostPath } from "@/lib/paths";

const SORT_COLUMNS = {
  posts: "post_count",
  activity: "last_activity",
  followers: "fediverse_followers",
  subscribers: "subscribers",
} as const;

type SortKey = keyof typeof SORT_COLUMNS;
type SortDir = "asc" | "desc";

export default async function AdminRootPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  await assertAdmin();

  const params = await searchParams;
  const sort: SortKey =
    params.sort && params.sort in SORT_COLUMNS
      ? (params.sort as SortKey)
      : "activity";
  const dir: SortDir = params.dir === "asc" ? "asc" : "desc";

  const orderExpr = sql.raw(
    `${SORT_COLUMNS[sort]} ${dir === "asc" ? "ASC" : "DESC"} NULLS LAST`
  );

  const blogs = await db
    .select({
      id: blog.id,
      slug: blog.slug,
      userId: blog.userId,
      postCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${postTable}
        WHERE ${postTable.blogId} = ${blog.id}
          AND ${postTable.published} IS NOT NULL
          AND ${postTable.deleted} IS NULL
      )`.as("post_count"),
      lastActivity: sql<string>`GREATEST(
        ${user.created},
        COALESCE(
          (SELECT MAX(${session.expires}) FROM ${session} WHERE ${session.userId} = ${user.id}) - INTERVAL '30 days',
          ${user.created}
        )
      )`.as("last_activity"),
      fediverseFollowers:
        sql<number>`COALESCE(${actorTable.followersCount}, 0)`.as(
          "fediverse_followers"
        ),
      subscribers: sql<number>`(
        SELECT COUNT(*)::int FROM ${mailingListSubscription}
        WHERE ${mailingListSubscription.blogId} = ${blog.id}
      )`.as("subscribers"),
      latestPostId: sql<string | null>`(
        SELECT id FROM ${postTable}
        WHERE ${postTable.blogId} = ${blog.id}
          AND ${postTable.published} IS NOT NULL
          AND ${postTable.deleted} IS NULL
        ORDER BY ${postTable.published} DESC
        LIMIT 1
      )`.as("latest_post_id"),
      latestPostTitle: sql<string | null>`(
        SELECT title FROM ${postTable}
        WHERE ${postTable.blogId} = ${blog.id}
          AND ${postTable.published} IS NOT NULL
          AND ${postTable.deleted} IS NULL
        ORDER BY ${postTable.published} DESC
        LIMIT 1
      )`.as("latest_post_title"),
    })
    .from(blog)
    .innerJoin(user, eq(user.id, blog.userId))
    .leftJoin(actorTable, eq(actorTable.blogId, blog.id))
    .orderBy(orderExpr);

  const sortLink = (key: SortKey, label: string) => {
    const nextDir = sort === key && dir === "desc" ? "asc" : "desc";
    const arrow = sort === key ? (dir === "desc" ? " ↓" : " ↑") : "";
    return (
      <Link
        href={`/admin?sort=${key}&dir=${nextDir}`}
        className="hover:underline"
      >
        {label}
        {arrow}
      </Link>
    );
  };

  return (
    <div>
      <Table>
        <TableCaption>블로그 목록</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>최근 글</TableHead>
            <TableHead>{sortLink("posts", "글 수")}</TableHead>
            <TableHead>{sortLink("activity", "최근 활동")}</TableHead>
            <TableHead>{sortLink("followers", "연합 팔로워")}</TableHead>
            <TableHead>{sortLink("subscribers", "구독자")}</TableHead>
            <TableHead>흉내내기</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {blogs.map((b) => (
            <TableRow key={b.id}>
              <TableCell>{b.slug}</TableCell>
              <TableCell>
                {b.latestPostId ? (
                  <Link href={getBlogPostPath(b.slug, b.latestPostId)}>
                    {b.latestPostTitle || "무제"}
                  </Link>
                ) : (
                  "글 없음"
                )}
              </TableCell>
              <TableCell>{b.postCount}</TableCell>
              <TableCell>
                {new Date(b.lastActivity).toLocaleDateString("ko-KR")}
              </TableCell>
              <TableCell>{b.fediverseFollowers}</TableCell>
              <TableCell>{b.subscribers}</TableCell>
              <TableCell>
                <ImpersonateButton userId={b.userId} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
