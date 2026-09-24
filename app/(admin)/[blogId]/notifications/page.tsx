import { formatInTimeZone } from "date-fns-tz";
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

  const notificationTypeLabels: Record<string, string> = {
    mention: "멘션",
    reply: "답글",
    quote: "인용",
    announce: "공유",
    like: "좋아요 ♥️",
    emoji_react: "리액션",
  };

  const unreadCount = notifications.filter((n) => !n.notification.read).length;
  const hasUnreadNotifications = unreadCount > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-row flex-wrap items-baseline gap-x-3">
        <h3 className="text-xl">
          알림{hasUnreadNotifications && ` (읽지 않음 ${unreadCount}개)`}
        </h3>
        <NotificationActions
          blogSlug={slug}
          hasUnreadNotifications={hasUnreadNotifications}
        />
      </div>
      <p className="text-neutral-500">
        연합우주에서 받은 멘션, 답글, 인용, 공유, 리액션을 확인할 수 있습니다.
      </p>

      {notifications.length === 0 ? (
        <p>아직 알림이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {notifications.map(({ notification, actor, post }) => {
            const time = formatInTimeZone(
              notification.created,
              "Asia/Seoul",
              "MM-dd HH:mm"
            );
            const showContent =
              notification.content &&
              !["emoji_react", "like", "announce"].includes(notification.type);

            return (
              <li key={notification.id} className="break-keep">
                <span className="font-bold tabular-nums">
                  {notification.type === "reply" && notification.url ? (
                    <a
                      href={notification.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {time}
                    </a>
                  ) : (
                    time
                  )}
                </span>{" "}
                <span
                  className={notification.read ? undefined : "text-blue-500"}
                >
                  {notificationTypeLabels[notification.type] ?? "알림"}
                  {notification.type === "emoji_react" &&
                    ` ${notification.content}`}
                </span>{" "}
                {actor.name || actor.username}{" "}
                <span className="text-neutral-500 break-all">
                  {actor.handle}
                </span>
                {notification.postId && (
                  <>
                    {" → "}
                    <a
                      href={getBlogPostPath(slug, notification.postId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {post.title || "무제"}
                    </a>
                  </>
                )}
                {showContent && (
                  <div
                    className="text-neutral-500 text-sm line-clamp-2"
                    dangerouslySetInnerHTML={{
                      __html: sanitize(notification.content!),
                    }}
                  />
                )}
                <NotificationActions
                  blogSlug={slug}
                  notificationId={notification.id}
                  isRead={notification.read !== null}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
