"use server";

import { db } from "@/lib/db";
import { pageViews, emailQueue, blog, post, mailingListSubscription } from "@/drizzle/schema";
import { eq, and, gte, lt, sql, desc, count, isNotNull, isNull } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRootPath } from "@/lib/paths";

export interface AnalyticsOverview {
  totalVisits: number;
  uniqueVisitors: number;
  totalPosts: number;
  publishedPosts: number;
  totalSubscribers: number;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
}

export interface VisitorTrend {
  date: string;
  visits: number;
  uniqueVisitors: number;
}

export interface PostPerformance {
  id: string;
  title: string;
  publishedAt: Date | null;
  visits: number;
  uniqueVisitors: number;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
}

export interface EmailAnalytics {
  date: string;
  sent: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
}

export async function getAnalyticsOverview(blogSlug: string): Promise<AnalyticsOverview | null> {
  const { user: sessionUser } = await getCurrentSession();
  if (!sessionUser) {
    redirect(getRootPath());
  }

  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogSlug),
  });

  if (!targetBlog || sessionUser.id !== targetBlog.userId) {
    redirect(getRootPath());
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get total and unique visits
  const [visitsResult] = await db
    .select({
      totalVisits: count(),
      uniqueVisitors: sql<number>`COUNT(DISTINCT ip_address)`,
    })
    .from(pageViews)
    .where(eq(pageViews.blogId, targetBlog.id));

  // Get post counts
  const [postsResult] = await db
    .select({
      totalPosts: count(),
      publishedPosts: sql<number>`COUNT(CASE WHEN published IS NOT NULL THEN 1 END)`,
    })
    .from(post)
    .where(and(eq(post.blogId, targetBlog.id), isNull(post.deleted)));

  // Get subscriber count
  const [subscribersResult] = await db
    .select({ count: count() })
    .from(mailingListSubscription)
    .where(eq(mailingListSubscription.blogId, targetBlog.id));

  // Get email analytics
  const [emailResult] = await db
    .select({
      emailsSent: sql<number>`COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END)`,
      emailsOpened: sql<number>`COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END)`,
      emailsClicked: sql<number>`COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END)`,
    })
    .from(emailQueue)
    .where(eq(emailQueue.blogId, targetBlog.id));

  return {
    totalVisits: visitsResult?.totalVisits || 0,
    uniqueVisitors: visitsResult?.uniqueVisitors || 0,
    totalPosts: postsResult?.totalPosts || 0,
    publishedPosts: postsResult?.publishedPosts || 0,
    totalSubscribers: subscribersResult?.count || 0,
    emailsSent: emailResult?.emailsSent || 0,
    emailsOpened: emailResult?.emailsOpened || 0,
    emailsClicked: emailResult?.emailsClicked || 0,
  };
}

export async function getVisitorTrends(blogSlug: string, days: number = 30): Promise<VisitorTrend[]> {
  const { user: sessionUser } = await getCurrentSession();
  if (!sessionUser) {
    redirect(getRootPath());
  }

  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogSlug),
  });

  if (!targetBlog || sessionUser.id !== targetBlog.userId) {
    redirect(getRootPath());
  }

  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const trends = await db
    .select({
      date: sql<string>`DATE(created_at)`,
      visits: count(),
      uniqueVisitors: sql<number>`COUNT(DISTINCT ip_address)`,
    })
    .from(pageViews)
    .where(
      and(
        eq(pageViews.blogId, targetBlog.id),
        gte(pageViews.createdAt, startDate)
      )
    )
    .groupBy(sql`DATE(created_at)`)
    .orderBy(sql`DATE(created_at)`);

  return trends;
}

export async function getPostPerformance(blogSlug: string): Promise<PostPerformance[]> {
  const { user: sessionUser } = await getCurrentSession();
  if (!sessionUser) {
    redirect(getRootPath());
  }

  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogSlug),
  });

  if (!targetBlog || sessionUser.id !== targetBlog.userId) {
    redirect(getRootPath());
  }

  const posts = await db
    .select({
      id: post.id,
      title: post.title,
      publishedAt: post.published,
      visits: sql<number>`COALESCE(pv.visits, 0)`,
      uniqueVisitors: sql<number>`COALESCE(pv.unique_visitors, 0)`,
      emailsSent: sql<number>`COALESCE(eq.emails_sent, 0)`,
      emailsOpened: sql<number>`COALESCE(eq.emails_opened, 0)`,
      emailsClicked: sql<number>`COALESCE(eq.emails_clicked, 0)`,
    })
    .from(post)
    .leftJoin(
      sql`(
        SELECT 
          post_id,
          COUNT(*) as visits,
          COUNT(DISTINCT ip_address) as unique_visitors
        FROM page_views 
        WHERE blog_id = ${targetBlog.id}
        GROUP BY post_id
      ) pv`,
      sql`pv.post_id = ${post.id}`
    )
    .leftJoin(
      sql`(
        SELECT 
          post_id,
          COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END) as emails_sent,
          COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as emails_opened,
          COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as emails_clicked
        FROM email_queue 
        WHERE blog_id = ${targetBlog.id}
        GROUP BY post_id
      ) eq`,
      sql`eq.post_id = ${post.id}`
    )
    .where(and(eq(post.blogId, targetBlog.id), isNull(post.deleted)))
    .orderBy(desc(post.published));

  return posts.map(p => ({
    id: p.id,
    title: p.title || "무제",
    publishedAt: p.publishedAt,
    visits: p.visits,
    uniqueVisitors: p.uniqueVisitors,
    emailsSent: p.emailsSent,
    emailsOpened: p.emailsOpened,
    emailsClicked: p.emailsClicked,
  }));
}

export async function getEmailAnalytics(blogSlug: string, days: number = 30): Promise<EmailAnalytics[]> {
  const { user: sessionUser } = await getCurrentSession();
  if (!sessionUser) {
    redirect(getRootPath());
  }

  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogSlug),
  });

  if (!targetBlog || sessionUser.id !== targetBlog.userId) {
    redirect(getRootPath());
  }

  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const emailStats = await db
    .select({
      date: sql<string>`DATE(sent_at)`,
      sent: sql<number>`COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END)`,
      opened: sql<number>`COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END)`,
      clicked: sql<number>`COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END)`,
    })
    .from(emailQueue)
    .where(
      and(
        eq(emailQueue.blogId, targetBlog.id),
        gte(emailQueue.sentAt, startDate),
        isNotNull(emailQueue.sentAt)
      )
    )
    .groupBy(sql`DATE(sent_at)`)
    .orderBy(sql`DATE(sent_at)`);

  return emailStats.map(stat => ({
    date: stat.date,
    sent: stat.sent,
    opened: stat.opened,
    clicked: stat.clicked,
    openRate: stat.sent > 0 ? (stat.opened / stat.sent) * 100 : 0,
    clickRate: stat.sent > 0 ? (stat.clicked / stat.sent) * 100 : 0,
  }));
}

export async function trackPageView(
  blogId: string,
  postId: string | null,
  ipAddress: string,
  userAgent: string | null,
  referrer: string | null,
  path: string
): Promise<void> {
  try {
    await db.insert(pageViews).values({
      id: crypto.randomUUID(),
      blogId,
      postId,
      ipAddress,
      userAgent,
      referrer,
      path,
    });
  } catch (error) {
    console.error("Error tracking page view:", error);
  }
}