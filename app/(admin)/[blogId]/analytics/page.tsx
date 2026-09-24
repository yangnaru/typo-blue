import {
  getAnalyticsOverview,
  getVisitorTrends,
  getPostPerformance,
  getEmailAnalytics,
  getActivityPubAnalytics,
} from "@/lib/actions/analytics";
import { getCurrentSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRootPath } from "@/lib/paths";
import { formatInTimeZone } from "date-fns-tz";
import { ko } from "date-fns/locale";

type PageProps = Promise<{
  blogId: string;
}>;

export default async function AnalyticsPage(props: { params: PageProps }) {
  const { blogId } = await props.params;
  const { user: sessionUser } = await getCurrentSession();

  if (!sessionUser) {
    redirect(getRootPath());
  }

  const decodedBlogId = decodeURIComponent(blogId);
  const slug = decodedBlogId.replace("@", "");

  const [
    overview,
    visitorTrends,
    postPerformance,
    emailAnalytics,
    activityPubAnalytics,
  ] = await Promise.all([
    getAnalyticsOverview(slug),
    getVisitorTrends(slug, 30),
    getPostPerformance(slug),
    getEmailAnalytics(slug, 30),
    getActivityPubAnalytics(slug),
  ]);

  if (!overview) {
    redirect(getRootPath());
  }

  const formatNumber = (num: number) => num.toLocaleString();
  const formatPercentage = (num: number) => `${num.toFixed(1)}%`;

  const emailTotals = emailAnalytics.reduce(
    (totals, day) => ({
      sent: totals.sent + day.sent,
      clicked: totals.clicked + day.clicked,
      openRate: totals.openRate + day.openRate,
      clickRate: totals.clickRate + day.clickRate,
    }),
    { sent: 0, clicked: 0, openRate: 0, clickRate: 0 }
  );
  const emailDays = Math.max(emailAnalytics.length, 1);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h3 className="text-xl">분석</h3>
        <ul>
          <li>
            방문 {formatNumber(overview.totalVisits)}회{" "}
            <span className="text-neutral-500">
              (순방문자 {formatNumber(overview.uniqueVisitors)}명)
            </span>
          </li>
          <li>
            발행된 글 {formatNumber(overview.publishedPosts)}개{" "}
            <span className="text-neutral-500">
              (전체 {formatNumber(overview.totalPosts)}개)
            </span>
          </li>
          <li>이메일 구독자 {formatNumber(overview.totalSubscribers)}명</li>
          <li>
            이메일 열람률{" "}
            {overview.emailsSent > 0
              ? formatPercentage(
                  (overview.emailsOpened / overview.emailsSent) * 100
                )
              : "0%"}{" "}
            <span className="text-neutral-500">
              ({formatNumber(overview.emailsSent)}통 중{" "}
              {formatNumber(overview.emailsOpened)}통 열람)
            </span>
          </li>
        </ul>
      </section>

      {activityPubAnalytics &&
        (activityPubAnalytics.followersCount > 0 ||
          activityPubAnalytics.followingCount > 0 ||
          activityPubAnalytics.totalNotifications > 0) && (
          <section className="space-y-2">
            <h3 className="text-lg">연합우주</h3>
            <ul>
              <li>
                팔로워 {formatNumber(activityPubAnalytics.followersCount)}명 ·
                팔로잉 {formatNumber(activityPubAnalytics.followingCount)}명
              </li>
              <li>
                알림 {formatNumber(activityPubAnalytics.totalNotifications)}개{" "}
                <span className="text-neutral-500">
                  (읽지 않음{" "}
                  {formatNumber(activityPubAnalytics.unreadNotifications)}개)
                </span>
              </li>
              <li>
                상호작용{" "}
                {formatNumber(
                  activityPubAnalytics.likesCount +
                    activityPubAnalytics.sharesCount +
                    activityPubAnalytics.repliesCount
                )}
                회{" "}
                <span className="text-neutral-500">
                  (좋아요 {formatNumber(activityPubAnalytics.likesCount)} · 공유{" "}
                  {formatNumber(activityPubAnalytics.sharesCount)})
                </span>
              </li>
            </ul>
          </section>
        )}

      <section className="space-y-2">
        <h3 className="text-lg">최근 방문자</h3>
        {visitorTrends.length > 0 ? (
          <>
            <PlainTable
              headers={["날짜", "방문", "순방문자", "방문/순방문자"]}
              rows={visitorTrends.slice(-10).map((trend) => [
                formatInTimeZone(new Date(trend.date), "Asia/Seoul", "MM/dd (E)", {
                  locale: ko,
                }),
                formatNumber(trend.visits),
                formatNumber(trend.uniqueVisitors),
                trend.uniqueVisitors > 0
                  ? (trend.visits / trend.uniqueVisitors).toFixed(1)
                  : "0",
              ])}
            />
            <p className="text-neutral-500 text-sm">
              최근 {visitorTrends.slice(-10).length}일. 방문/순방문자 비율이
              높을수록 재방문이 많습니다.
            </p>
          </>
        ) : (
          <p className="text-neutral-500">아직 방문자 데이터가 없습니다.</p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-lg">글별 성과</h3>
        {postPerformance.length > 0 ? (
          <ul className="space-y-2">
            {postPerformance.map((post) => (
              <li key={post.id} className="break-keep">
                <span className="font-bold tabular-nums">
                  {post.publishedAt
                    ? formatInTimeZone(
                        post.publishedAt,
                        "Asia/Seoul",
                        "yyyy-MM-dd"
                      )
                    : "초안"}
                </span>{" "}
                {post.title}
                <p className="text-neutral-500 text-sm">
                  조회 {formatNumber(post.visits)} · 순방문자{" "}
                  {formatNumber(post.uniqueVisitors)} · 이메일 발송{" "}
                  {formatNumber(post.emailsSent)}
                  {post.emailsSent > 0 &&
                    ` · 열람 ${formatNumber(post.emailsOpened)} (${formatPercentage(
                      (post.emailsOpened / post.emailsSent) * 100
                    )})`}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-neutral-500">글이 없습니다.</p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-lg">이메일 (최근 30일)</h3>
        {emailAnalytics.length > 0 ? (
          <>
            <p>
              발송 {formatNumber(emailTotals.sent)}통 · 평균 열람률{" "}
              {formatPercentage(emailTotals.openRate / emailDays)} · 평균
              클릭률 {formatPercentage(emailTotals.clickRate / emailDays)} ·
              클릭 {formatNumber(emailTotals.clicked)}회
            </p>
            <PlainTable
              headers={["날짜", "발송", "열람", "클릭", "열람률", "클릭률"]}
              rows={emailAnalytics.slice(-10).map((day) => [
                formatInTimeZone(new Date(day.date), "Asia/Seoul", "MM/dd (E)", {
                  locale: ko,
                }),
                formatNumber(day.sent),
                formatNumber(day.opened),
                formatNumber(day.clicked),
                formatPercentage(day.openRate),
                formatPercentage(day.clickRate),
              ])}
            />
          </>
        ) : (
          <p className="text-neutral-500">아직 이메일 데이터가 없습니다.</p>
        )}
      </section>
    </div>
  );
}

function PlainTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="border-b border-neutral-500">
            {headers.map((header) => (
              <th key={header} className="py-1 pr-4 text-left font-bold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) => (
                <td key={i} className="py-1 pr-4">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
