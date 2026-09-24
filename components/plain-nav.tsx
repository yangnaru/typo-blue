"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pill, PillItem } from "@/components/pill";

export type PlainNavLink = {
  href: string;
  label: string;
  // Also highlight the link on pages below it, e.g. /admin/users/123.
  matchPrefix?: boolean;
};

export default function PlainNav({
  label,
  links,
}: {
  label: string;
  links: PlainNavLink[];
}) {
  const pathname = decodeURIComponent(usePathname());

  return (
    <nav aria-label={label}>
      <Pill>
        {links.map(({ href, label, matchPrefix }) => {
          const isCurrent = matchPrefix
            ? pathname === href || pathname.startsWith(`${href}/`)
            : pathname === href;
          return (
            <PillItem key={href} active={isCurrent} asChild>
              <Link href={href} aria-current={isCurrent ? "page" : undefined}>
                {label}
              </Link>
            </PillItem>
          );
        })}
      </Pill>
    </nav>
  );
}
