import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import formatInTimeZone from "date-fns-tz/formatInTimeZone";
import { getBlogPostPath, getRootPath } from "@/lib/paths";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import {
  blog,
  notificationTable,
  actorTable,
  postTable,
} from "@/drizzle/schema";
import { Bell, MessageCircle, Quote, Reply, Share } from "lucide-react";
import { NotificationActions } from "@/components/NotificationActions";
import sanitize from "sanitize-html";

type PageProps = Promise<{
  blogId: string;
}>;

export default async function NotificationsPage(props: { params: PageProps }) {
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

  // Fetch notifications for this blog
  const notifications = await db
    .select({
      notification: notificationTable,
      actor: actorTable,
      post: postTable,
    })
    .from(notificationTable)
    .innerJoin(actorTable, eq(notificationTable.actorId, actorTable.id))
    .innerJoin(postTable, eq(notificationTable.postId, postTable.id))
    .where(eq(postTable.blogId, currentBlog.id))
    .orderBy(desc(notificationTable.created))
    .limit(50);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "reply":
        return <Bell className="h-4 w-4" />;
      case "quote":
        return <Quote className="h-4 w-4" />;
      case "reply":
        return <Reply className="h-4 w-4" />;
      case "announce":
        return <Share className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case "reply":
        return "멘션";
      case "quote":
        return "인용";
      case "reply":
        return "답글";
      case "announce":
        return "공유";
      case "emoji_react":
      case "like":
        return "리액션";
      default:
        return "알림";
    }
  };

  const getNotificationVariant = (type: string) => {
    switch (type) {
      case "reply":
        return "default" as const;
      case "quote":
        return "secondary" as const;
      case "reply":
        return "outline" as const;
      case "announce":
        return "outline" as const;
      default:
        return "default" as const;
    }
  };

  const unreadCount = notifications.filter((n) => !n.notification.read).length;
  const hasUnreadNotifications = unreadCount > 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">연합우주 알림</h1>
          {hasUnreadNotifications && (
            <>
              <Badge variant="destructive">{unreadCount}</Badge>
              <div className="flex items-center gap-2 ml-auto">
                <NotificationActions
                  blogSlug={slug}
                  hasUnreadNotifications={hasUnreadNotifications}
                />
              </div>
            </>
          )}
        </div>

        <p className="text-muted-foreground">
          연합우주에서 받은 멘션, 인용, 답글을 확인할 수 있습니다.
        </p>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-muted/30">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <h3 className="font-medium text-muted-foreground mb-1">
            아직 알림이 없습니다
          </h3>
          <p className="text-sm text-muted-foreground">
            연합우주에서 블로그를 멘션하거나 인용하면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((notification) => (
            <div
              key={notification.notification.id}
              className={`border rounded-md p-2 transition-colors ${
                !notification.notification.read
                  ? "bg-accent/50 border-accent"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                  <Badge
                    variant={getNotificationVariant(
                      notification.notification.type
                    )}
                    className="flex items-center gap-1 text-xs h-5 px-2 py-0.5 shrink-0"
                  >
                    {getNotificationIcon(notification.notification.type)}
                    {getNotificationTypeLabel(notification.notification.type)}
                  </Badge>

                  {notification.notification.type === "emoji_react" && (
                    <span className="text-xs text-muted-foreground">
                      {notification.notification.content}
                    </span>
                  )}
                  {notification.notification.type === "like" && (
                    <span className="text-xs">♥️</span>
                  )}

                  <span className="font-medium text-sm truncate">
                    {notification.actor.name || notification.actor.username}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {notification.actor.handle}
                  </span>

                  {notification.notification.postId && (
                    <Button
                      size="sm"
                      variant="link"
                      className="h-auto p-0 text-xs text-muted-foreground"
                      asChild
                    >
                      <a
                        href={getBlogPostPath(
                          slug,
                          notification.notification.postId
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        → {notification.post.title ?? "무제"}
                      </a>
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {notification.notification.type === "reply" &&
                    notification.notification.activityId ? (
                      <a
                        href={notification.notification.url || ""}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-primary transition-colors"
                      >
                        {formatInTimeZone(
                          notification.notification.created,
                          "Asia/Seoul",
                          "MM월 dd일 HH:mm"
                        )}
                      </a>
                    ) : (
                      formatInTimeZone(
                        notification.notification.created,
                        "Asia/Seoul",
                        "MM월 dd일 HH:mm"
                      )
                    )}
                  </span>
                  <NotificationActions
                    blogSlug={slug}
                    notificationId={notification.notification.id}
                    isRead={notification.notification.read !== null}
                  />
                </div>
              </div>

              {notification.notification.type !== "emoji_react" &&
                notification.notification.type !== "like" &&
                notification.notification.content &&
                notification.notification.type !== "announce" && (
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {notification.notification.content ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: sanitize(notification.notification.content),
                        }}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">
                        {notification.notification.content}
                      </p>
                    )}
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
