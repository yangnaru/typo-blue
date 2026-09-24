"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

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
    <nav className="flex flex-row flex-wrap gap-x-3 gap-y-1 break-keep">
      {links.map(({ href, label }) => {
        const isCurrent = decodeURIComponent(pathname) === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            className={isCurrent ? "font-bold" : "text-blue-500"}
          >
            {label}
          </Link>
        );
      })}
      <Link href={getBlogHomePath(slug)} className="text-neutral-500">
        블로그 보기
      </Link>
    </nav>
  );
}
