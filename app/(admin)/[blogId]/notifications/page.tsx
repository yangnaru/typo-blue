import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import formatInTimeZone from "date-fns-tz/formatInTimeZone";
import { getRootPath } from "@/lib/paths";
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
import { getActorForBlog } from "@/lib/activitypub";
import { Bell, MessageCircle, Quote, Reply, Share } from "lucide-react";
import { NotificationActions } from "@/components/NotificationActions";
import { encodePostId } from "@/lib/utils";

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

  // Check if ActivityPub is enabled for this blog
  const blogActor = await getActorForBlog(currentBlog.id);
  if (!blogActor) {
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                알림
                {hasUnreadNotifications && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                연합우주에서 받은 멘션, 인용, 답글을 확인할 수 있습니다 (
                {notifications.length}개)
              </CardDescription>
            </div>
            {hasUnreadNotifications && (
              <NotificationActions
                blogSlug={slug}
                hasUnreadNotifications={hasUnreadNotifications}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-4">
                <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-muted-foreground">
                아직 알림이 없습니다
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                연합우주에서 블로그를 멘션하거나 인용하면 여기에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <Card
                  key={notification.notification.id}
                  className={`transition-colors ${
                    !notification.notification.read
                      ? "bg-accent/50 border-accent border-2 ring-2 ring-accent/30"
                      : ""
                  }`}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={getNotificationVariant(
                              notification.notification.type
                            )}
                            className="flex items-center gap-1"
                          >
                            {getNotificationIcon(
                              notification.notification.type
                            )}
                            {getNotificationTypeLabel(
                              notification.notification.type
                            )}
                          </Badge>
                          {notification.notification.type === "emoji_react" && (
                            <span className="text-sm text-muted-foreground">
                              {notification.notification.content}
                            </span>
                          )}
                          {notification.notification.type === "like" && (
                            <span className="text-sm text-muted-foreground">
                              ♥️
                            </span>
                          )}
                          <span className="font-medium">
                            {notification.actor.name ||
                              notification.actor.username}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {notification.actor.handle}
                          </span>
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
                          {notification.notification.postId && (
                            <Button size="sm" variant="link" asChild>
                              <a
                                href={`/@${slug}/${encodePostId(
                                  notification.notification.postId
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs"
                              >
                                원본 글 보기:{" "}
                                {notification.post.title ?? "무제"}
                              </a>
                            </Button>
                          )}
                        </div>

                        {notification.notification.type !== "emoji_react" &&
                          notification.notification.type !== "like" &&
                          notification.notification.content &&
                          notification.notification.type !== "announce" && (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              {notification.notification.content ? (
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: notification.notification.content,
                                  }}
                                />
                              ) : (
                                <p className="whitespace-pre-wrap">
                                  {notification.notification.content}
                                </p>
                              )}
                            </div>
                          )}

                        <div className="flex items-center gap-2 pt-2">
                          <NotificationActions
                            blogSlug={slug}
                            notificationId={notification.notification.id}
                            isRead={notification.notification.read !== null}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
