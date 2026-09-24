"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type PlainNavLink = {
  href: string;
  label: string;
  // Also highlight the link on pages below it, e.g. /admin/users/123.
  matchPrefix?: boolean;
  secondary?: boolean;
};

export default function PlainNav({ links }: { links: PlainNavLink[] }) {
  const pathname = decodeURIComponent(usePathname());

  return (
    <nav className="flex flex-row flex-wrap gap-x-3 gap-y-1 break-keep">
      {links.map(({ href, label, matchPrefix, secondary }) => {
        const isCurrent = matchPrefix
          ? pathname === href || pathname.startsWith(`${href}/`)
          : pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            className={
              isCurrent
                ? "font-bold"
                : secondary
                  ? "text-neutral-500"
                  : "text-blue-500"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
