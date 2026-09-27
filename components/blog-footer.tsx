import Link from "next/link";
import { getBlogSubscribePath, getRootPath } from "@/lib/paths";

// The end of every page of a blog: "powered by typo blue", then the visit count
// and a link to the ways to follow the blog.
export default function BlogFooter({
  blog,
}: {
  blog: { slug: string; visitor_count: number } | null;
}) {
  return (
    <footer className="mt-8 mb-8 pt-3 border-t border-neutral-200 dark:border-neutral-800">
      <div className="flex flex-row items-baseline justify-between gap-3 text-xs font-semibold">
        <Link href={getRootPath()}>
          <span className="text-neutral-500">powered by</span> typo{" "}
          <span className="text-blue-500">blue</span>
        </Link>
        {blog && (
          <span className="text-neutral-500 tabular-nums">
            HIT {blog.visitor_count.toLocaleString("ko-KR")} ·{" "}
            <Link href={getBlogSubscribePath(blog.slug)}>구독</Link>
          </span>
        )}
      </div>
    </footer>
  );
}
