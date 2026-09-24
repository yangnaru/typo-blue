import { formatInTimeZone } from "date-fns-tz";
import { assertAdmin } from "@/lib/server-util";
import { getCurrentSession } from "@/lib/auth";
import ImpersonateButton from "./impersonate-button";
import AdminToggleButton from "./admin-toggle-button";
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
import { getBlogHomePath, getBlogPostPath } from "@/lib/paths";

const SORT_COLUMNS = {
  posts: "post_count",
  activity: "last_activity",
  followers: "fediverse_followers",
  subscribers: "subscribers",
} as const;

type SortKey = keyof typeof SORT_COLUMNS;
type SortDir = "asc" | "desc";

type MetricsRow = {
  total_users: number;
  total_blogs: number;
  total_posts: number;
  posts_last_7_days: number;
  total_subscribers: number;
  total_followers: number;
};

export default async function AdminRootPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  await assertAdmin();
  const { user: currentUser } = await getCurrentSession();

  const params = await searchParams;
  const sort: SortKey =
    params.sort && params.sort in SORT_COLUMNS
      ? (params.sort as SortKey)
      : "activity";
  const dir: SortDir = params.dir === "asc" ? "asc" : "desc";

  const orderExpr = sql.raw(
    `${SORT_COLUMNS[sort]} ${dir === "asc" ? "ASC" : "DESC"} NULLS LAST`
  );

  const metricsResult = await db.execute<MetricsRow>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM "user") AS total_users,
      (SELECT COUNT(*)::int FROM blog) AS total_blogs,
      (SELECT COUNT(*)::int FROM post WHERE published IS NOT NULL AND deleted IS NULL) AS total_posts,
      (SELECT COUNT(*)::int FROM post WHERE first_published >= NOW() - INTERVAL '7 days' AND deleted IS NULL) AS posts_last_7_days,
      (SELECT COUNT(*)::int FROM mailing_list_subscription) AS total_subscribers,
      (SELECT COALESCE(SUM(followers_count), 0)::int FROM actor WHERE blog_id IS NOT NULL) AS total_followers
  `);
  const metrics = metricsResult.rows[0];

  const blogs = await db
    .select({
      id: blog.id,
      slug: blog.slug,
      userId: blog.userId,
      userEmail: user.email,
      userIsAdmin: user.isAdmin,
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
        className={sort === key ? "font-bold" : "text-blue-500"}
      >
        {label}
        {arrow}
      </Link>
    );
  };

  const formatCount = (value: number) => value.toLocaleString("ko-KR");

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h3 className="text-xl">대시보드</h3>
        <ul>
          <li>
            사용자 {formatCount(metrics.total_users)}명 · 블로그{" "}
            {formatCount(metrics.total_blogs)}개
          </li>
          <li>
            발행된 글 {formatCount(metrics.total_posts)}개{" "}
            <span className="text-neutral-500">
              (최근 7일 {formatCount(metrics.posts_last_7_days)}개)
            </span>
          </li>
          <li>
            이메일 구독자 {formatCount(metrics.total_subscribers)}명 · 연합
            팔로워 {formatCount(metrics.total_followers)}명
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg">블로그 목록</h3>
        <p className="flex flex-row flex-wrap gap-x-3 text-sm">
          <span className="text-neutral-500">정렬:</span>
          {sortLink("activity", "최근 활동")}
          {sortLink("posts", "글 수")}
          {sortLink("followers", "연합 팔로워")}
          {sortLink("subscribers", "구독자")}
        </p>
        <ul className="space-y-4">
          {blogs.map((b) => (
            <li key={b.id} className="space-y-1 break-all">
              <p>
                <Link href={getBlogHomePath(b.slug)} className="font-bold">
                  @{b.slug}
                </Link>{" "}
                <span className="text-neutral-500">{b.userEmail}</span>
              </p>
              <p className="text-neutral-500 text-sm">
                글 {b.postCount}개 · 최근 활동{" "}
                {formatInTimeZone(new Date(b.lastActivity), "Asia/Seoul", "yyyy-MM-dd")} · 연합
                팔로워 {b.fediverseFollowers} · 구독자 {b.subscribers}
              </p>
              <p className="text-sm">
                <span className="text-neutral-500">최근 글: </span>
                {b.latestPostId ? (
                  <Link href={getBlogPostPath(b.slug, b.latestPostId)}>
                    {b.latestPostTitle || "무제"}
                  </Link>
                ) : (
                  <span className="text-neutral-500">글 없음</span>
                )}
              </p>
              <div className="flex flex-row gap-2 text-sm">
                <AdminToggleButton
                  userId={b.userId}
                  isAdmin={b.userIsAdmin}
                  disabled={b.userId === currentUser?.id}
                />
                <ImpersonateButton userId={b.userId} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
