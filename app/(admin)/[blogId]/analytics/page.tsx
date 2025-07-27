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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAnalyticsOverview,
  getVisitorTrends,
  getPostPerformance,
  getEmailAnalytics,
} from "@/lib/actions/analytics";
import { getCurrentSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRootPath } from "@/lib/paths";
import { Eye, Users, Mail, MousePointerClick, TrendingUp, FileText } from "lucide-react";
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

  const [overview, visitorTrends, postPerformance, emailAnalytics] = await Promise.all([
    getAnalyticsOverview(slug),
    getVisitorTrends(slug, 30),
    getPostPerformance(slug),
    getEmailAnalytics(slug, 30),
  ]);

  if (!overview) {
    redirect(getRootPath());
  }

  const formatNumber = (num: number) => num.toLocaleString();
  const formatPercentage = (num: number) => `${num.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Insights into your blog's performance and audience engagement
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(overview.totalVisits)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(overview.uniqueVisitors)} unique visitors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(overview.publishedPosts)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(overview.totalPosts)} total posts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(overview.totalSubscribers)}</div>
            <p className="text-xs text-muted-foreground">Email subscribers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Performance</CardTitle>
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
              {formatNumber(overview.emailsOpened)} of {formatNumber(overview.emailsSent)} opened
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="visitors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="visitors">Visitors</TabsTrigger>
          <TabsTrigger value="posts">Post Performance</TabsTrigger>
          <TabsTrigger value="email">Email Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="visitors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visitor Trends (Last 30 Days)</CardTitle>
              <CardDescription>
                Daily visitor statistics for your blog
              </CardDescription>
            </CardHeader>
            <CardContent>
              {visitorTrends.length > 0 ? (
                <div className="space-y-2">
                  {visitorTrends.slice(-7).map((trend) => (
                    <div key={trend.date} className="flex items-center justify-between">
                      <span className="text-sm">{trend.date}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium">{trend.visits} visits</span>
                        <span className="text-sm text-muted-foreground">
                          {trend.uniqueVisitors} unique
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No visitor data available yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Post Performance</CardTitle>
              <CardDescription>
                View and email engagement metrics for your posts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Post Title</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Unique Visitors</TableHead>
                    <TableHead>Emails Sent</TableHead>
                    <TableHead>Email Opens</TableHead>
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
                            <Badge variant="secondary">Draft</Badge>
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
                        No posts found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Analytics (Last 30 Days)</CardTitle>
              <CardDescription>
                Email delivery and engagement statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailAnalytics.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Emails Sent</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatNumber(emailAnalytics.reduce((sum, day) => sum + day.sent, 0))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Average Open Rate</CardTitle>
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
                        <CardTitle className="text-sm">Average Click Rate</CardTitle>
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
                    <h4 className="text-sm font-medium">Recent Email Performance</h4>
                    {emailAnalytics.slice(-7).map((day) => (
                      <div key={day.date} className="flex items-center justify-between">
                        <span className="text-sm">{day.date}</span>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm">
                            {formatNumber(day.sent)} sent
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatPercentage(day.openRate)} open
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatPercentage(day.clickRate)} click
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No email data available yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}