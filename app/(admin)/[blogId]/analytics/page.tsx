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
import { Eye, Users, Mail, MousePointerClick, TrendingUp, FileText, Globe, Bell, Heart, Share, MessageCircle } from "lucide-react";
import formatInTimeZone from "date-fns-tz/formatInTimeZone";

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

  const [overview, visitorTrends, postPerformance, emailAnalytics, activityPubAnalytics] = await Promise.all([
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">분석</h1>
        <p className="text-muted-foreground">
          블로그 성과와 독자 참여도에 대한 인사이트
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 방문수</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(overview.totalVisits)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(overview.uniqueVisitors)} 순 방문자
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">글</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(overview.publishedPosts)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(overview.totalPosts)} 전체 글
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">구독자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(overview.totalSubscribers)}</div>
            <p className="text-xs text-muted-foreground">이메일 구독자</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이메일 성과</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.emailsSent > 0 
                ? formatPercentage((overview.emailsOpened / overview.emailsSent) * 100)
                : "0%"
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(overview.emailsSent)}개 중 {formatNumber(overview.emailsOpened)}개 열림
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ActivityPub Analytics */}
      {activityPubAnalytics && (activityPubAnalytics.followersCount > 0 || activityPubAnalytics.followingCount > 0 || activityPubAnalytics.totalNotifications > 0) && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <h2 className="text-xl font-semibold">연합우주 분석</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">팔로워</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(activityPubAnalytics.followersCount)}</div>
                <p className="text-xs text-muted-foreground">연합우주 팔로워</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">팔로잉</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(activityPubAnalytics.followingCount)}</div>
                <p className="text-xs text-muted-foreground">팔로우 중</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">알림</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(activityPubAnalytics.totalNotifications)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(activityPubAnalytics.unreadNotifications)} 읽지 않음
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">상호작용</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(activityPubAnalytics.likesCount + activityPubAnalytics.sharesCount + activityPubAnalytics.repliesCount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(activityPubAnalytics.likesCount)} 좋아요, {formatNumber(activityPubAnalytics.sharesCount)} 공유
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Visitor Trends */}
      <Card>
        <CardHeader>
          <CardTitle>방문자 추이 (최근 30일)</CardTitle>
          <CardDescription>
            블로그의 일별 방문자 통계
          </CardDescription>
        </CardHeader>
        <CardContent>
          {visitorTrends.length > 0 ? (
            <div className="space-y-2">
              {visitorTrends.slice(-7).map((trend) => (
                <div key={trend.date} className="flex items-center justify-between">
                  <span className="text-sm">{trend.date}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium">{trend.visits} 방문</span>
                    <span className="text-sm text-muted-foreground">
                      {trend.uniqueVisitors} 순방문자
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">아직 방문자 데이터가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* Post Performance */}
      <Card>
        <CardHeader>
          <CardTitle>글 성과</CardTitle>
          <CardDescription>
            글의 조회수와 이메일 참여 지표
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>글 제목</TableHead>
                <TableHead>발행일</TableHead>
                <TableHead>조회수</TableHead>
                <TableHead>순방문자</TableHead>
                <TableHead>이메일 발송</TableHead>
                <TableHead>이메일 열람</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {postPerformance.length > 0 ? (
                postPerformance.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">{post.title}</TableCell>
                    <TableCell>
                      {post.publishedAt ? (
                        <span className="text-sm">
                          {formatInTimeZone(
                            post.publishedAt,
                            "Asia/Seoul",
                            "yyyy-MM-dd"
                          )}
                        </span>
                      ) : (
                        <Badge variant="secondary">초안</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatNumber(post.visits)}</TableCell>
                    <TableCell>{formatNumber(post.uniqueVisitors)}</TableCell>
                    <TableCell>{formatNumber(post.emailsSent)}</TableCell>
                    <TableCell>
                      {post.emailsSent > 0 ? (
                        <div>
                          <span>{formatNumber(post.emailsOpened)}</span>
                          <span className="text-xs text-muted-foreground ml-1">
                            ({formatPercentage((post.emailsOpened / post.emailsSent) * 100)})
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    글이 없습니다
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Email Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>이메일 분석 (최근 30일)</CardTitle>
          <CardDescription>
            이메일 발송 및 참여 통계
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailAnalytics.length > 0 ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">이메일 발송</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(emailAnalytics.reduce((sum, day) => sum + day.sent, 0))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">평균 열람률</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatPercentage(
                        emailAnalytics.reduce((sum, day) => sum + day.openRate, 0) /
                        Math.max(emailAnalytics.length, 1)
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">평균 클릭률</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatPercentage(
                        emailAnalytics.reduce((sum, day) => sum + day.clickRate, 0) /
                        Math.max(emailAnalytics.length, 1)
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">최근 이메일 성과</h4>
                {emailAnalytics.slice(-7).map((day) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <span className="text-sm">{day.date}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm">
                        {formatNumber(day.sent)} 발송
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatPercentage(day.openRate)} 열람
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatPercentage(day.clickRate)} 클릭
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">아직 이메일 데이터가 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}