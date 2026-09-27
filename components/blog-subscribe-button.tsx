"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlainButton } from "@/components/plain-button";
import { getBlogSubscribePath } from "@/lib/paths";
import { cn } from "@/lib/utils";

// The 구독 button at the right of a blog's header, filled in on the subscribe
// page itself.
export function BlogSubscribeButton({ slug }: { slug: string }) {
  const href = getBlogSubscribePath(slug);
  const current = decodeURIComponent(usePathname()) === href;

  return (
    <PlainButton
      asChild
      className={cn(
        "shrink-0 text-sm",
        current && "bg-blue-500 text-white hover:bg-blue-500 hover:text-white"
      )}
    >
      <Link href={href} aria-current={current ? "page" : undefined}>
        구독
      </Link>
    </PlainButton>
  );
}
