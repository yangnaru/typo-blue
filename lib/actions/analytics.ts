"use server";

import { db } from "@/lib/db";
import {
  pageViews,
  emailQueue,
  blog,
  postTable,
  mailingListSubscription,
  actorTable,
  followingTable,
  notificationTable,
} from "@/drizzle/schema";
import {
  eq,
  and,
  gte,
  lt,
  sql,
  desc,
  count,
  isNotNull,
  isNull,
} from "drizzle-orm";
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

export interface ActivityPubAnalytics {
  followersCount: number;
  followingCount: number;
  totalNotifications: number;
  unreadNotifications: number;
  mentionsCount: number;
  likesCount: number;
  sharesCount: number;
  repliesCount: number;
}

export async function getAnalyticsOverview(
  blogSlug: string
): Promise<AnalyticsOverview | null> {
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
    .from(postTable)
    .where(and(eq(postTable.blogId, targetBlog.id), isNull(postTable.deleted)));

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
    totalVisits: Number(visitsResult?.totalVisits) || 0,
    uniqueVisitors: Number(visitsResult?.uniqueVisitors) || 0,
    totalPosts: Number(postsResult?.totalPosts) || 0,
    publishedPosts: Number(postsResult?.publishedPosts) || 0,
    totalSubscribers: Number(subscribersResult?.count) || 0,
    emailsSent: Number(emailResult?.emailsSent) || 0,
    emailsOpened: Number(emailResult?.emailsOpened) || 0,
    emailsClicked: Number(emailResult?.emailsClicked) || 0,
  };
}

export async function getVisitorTrends(
  blogSlug: string,
  days: number = 30
): Promise<VisitorTrend[]> {
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

  return trends.map(trend => ({
    date: trend.date,
    visits: Number(trend.visits) || 0,
    uniqueVisitors: Number(trend.uniqueVisitors) || 0,
  }));
}

export async function getPostPerformance(
  blogSlug: string
): Promise<PostPerformance[]> {
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
      id: postTable.id,
      title: postTable.title,
      publishedAt: postTable.published,
      visits: sql<number>`COALESCE(pv.visits, 0)`,
      uniqueVisitors: sql<number>`COALESCE(pv.unique_visitors, 0)`,
      emailsSent: sql<number>`COALESCE(eq.emails_sent, 0)`,
      emailsOpened: sql<number>`COALESCE(eq.emails_opened, 0)`,
      emailsClicked: sql<number>`COALESCE(eq.emails_clicked, 0)`,
    })
    .from(postTable)
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
      sql`pv.post_id = ${postTable.id}`
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
      sql`eq.post_id = ${postTable.id}`
    )
    .where(and(eq(postTable.blogId, targetBlog.id), isNull(postTable.deleted)))
    .orderBy(desc(postTable.published));

  return posts.map((p) => ({
    id: p.id,
    title: p.title || "무제",
    publishedAt: p.publishedAt,
    visits: Number(p.visits) || 0,
    uniqueVisitors: Number(p.uniqueVisitors) || 0,
    emailsSent: Number(p.emailsSent) || 0,
    emailsOpened: Number(p.emailsOpened) || 0,
    emailsClicked: Number(p.emailsClicked) || 0,
  }));
}

export async function getEmailAnalytics(
  blogSlug: string,
  days: number = 30
): Promise<EmailAnalytics[]> {
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

  return emailStats.map((stat) => ({
    date: stat.date,
    sent: Number(stat.sent) || 0,
    opened: Number(stat.opened) || 0,
    clicked: Number(stat.clicked) || 0,
    openRate: Number(stat.sent) > 0 ? (Number(stat.opened) / Number(stat.sent)) * 100 : 0,
    clickRate: Number(stat.sent) > 0 ? (Number(stat.clicked) / Number(stat.sent)) * 100 : 0,
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

export async function getActivityPubAnalytics(
  blogSlug: string
): Promise<ActivityPubAnalytics | null> {
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

  // Get the actor for this blog
  const actor = await db.query.actorTable.findFirst({
    where: eq(actorTable.blogId, targetBlog.id),
  });

  // If no actor, return zeros
  if (!actor) {
    return {
      followersCount: 0,
      followingCount: 0,
      totalNotifications: 0,
      unreadNotifications: 0,
      mentionsCount: 0,
      likesCount: 0,
      sharesCount: 0,
      repliesCount: 0,
    };
  }

  // Get followers count
  const [followersResult] = await db
    .select({ count: count() })
    .from(followingTable)
    .where(eq(followingTable.followeeId, actor.id));

  // Get following count  
  const [followingResult] = await db
    .select({ count: count() })
    .from(followingTable)
    .where(eq(followingTable.followerId, actor.id));

  // Get notification statistics
  const [notificationsResult] = await db
    .select({
      totalNotifications: count(),
      unreadNotifications: sql<number>`COUNT(CASE WHEN read IS NULL THEN 1 END)`,
      mentionsCount: sql<number>`COUNT(CASE WHEN type = 'reply' THEN 1 END)`,
      likesCount: sql<number>`COUNT(CASE WHEN type = 'like' THEN 1 END)`,
      sharesCount: sql<number>`COUNT(CASE WHEN type = 'announce' THEN 1 END)`,
      repliesCount: sql<number>`COUNT(CASE WHEN type = 'reply' THEN 1 END)`,
    })
    .from(notificationTable)
    .innerJoin(postTable, eq(notificationTable.postId, postTable.id))
    .where(eq(postTable.blogId, targetBlog.id));

  return {
    followersCount: followersResult?.count || 0,
    followingCount: followingResult?.count || 0,
    totalNotifications: Number(notificationsResult?.totalNotifications) || 0,
    unreadNotifications: Number(notificationsResult?.unreadNotifications) || 0,
    mentionsCount: Number(notificationsResult?.mentionsCount) || 0,
    likesCount: Number(notificationsResult?.likesCount) || 0,
    sharesCount: Number(notificationsResult?.sharesCount) || 0,
    repliesCount: Number(notificationsResult?.repliesCount) || 0,
  };
}
