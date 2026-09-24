import PlainNav from "@/components/plain-nav";
import {
  getBlogAnalyticsPath,
  getBlogCalendarPath,
  getBlogFediversePath,
  getBlogHomePath,
  getBlogNewPostPath,
  getBlogNotificationsPath,
  getBlogPostsPath,
  getBlogSettingsPath,
  getBlogSubscribersPath,
} from "@/lib/paths";

export default function OwnerNav({
  slug,
  isFederationEnabled,
  unreadNotificationCount,
}: {
  slug: string;
  isFederationEnabled: boolean;
  unreadNotificationCount: number;
}) {
  const links = [
    { href: getBlogPostsPath(slug), label: "글 목록" },
    { href: getBlogNewPostPath(slug), label: "새 글 쓰기" },
    { href: getBlogCalendarPath(slug), label: "달력" },
    { href: getBlogAnalyticsPath(slug), label: "분석" },
    { href: getBlogSubscribersPath(slug), label: "구독자" },
    ...(isFederationEnabled
      ? [
          {
            href: getBlogNotificationsPath(slug),
            label:
              unreadNotificationCount > 0
                ? `알림 (${unreadNotificationCount})`
                : "알림",
          },
        ]
      : []),
    { href: getBlogFediversePath(slug), label: "연합우주" },
    { href: getBlogSettingsPath(slug), label: "설정" },
  ];

  return (
    <PlainNav
      links={[
        ...links,
        { href: getBlogHomePath(slug), label: "블로그 보기", secondary: true },
      ]}
    />
  );
}
