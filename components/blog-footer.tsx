import Link from "next/link";
import { getBlogHomePath, getRootPath } from "@/lib/paths";

// The end of every page of a blog: whose blog it is and a way to subscribe,
// then "powered by typo blue" and the visit count on one small line.
export default function BlogFooter({
  blog,
  showSubscribe,
}: {
  blog: { slug: string; name: string | null; visitor_count: number } | null;
  // The mailing list form is on the blog's first page, except for its owner.
  showSubscribe: boolean;
}) {
  return (
    <footer className="mt-12 mb-8 pt-6 space-y-3 border-t border-neutral-200 dark:border-neutral-800">
      {blog && (
        <div className="space-y-1 break-keep">
          <Link href={getBlogHomePath(blog.slug)} className="font-semibold">
            {blog.name || `@${blog.slug}`}
          </Link>
          {showSubscribe && (
            <p className="text-neutral-500 text-sm">
              <Link
                href={`${getBlogHomePath(blog.slug)}#subscribe`}
                className="underline"
              >
                메일 구독
              </Link>
            </p>
          )}
        </div>
      )}
      <div className="flex flex-row items-baseline justify-between gap-3 text-xs font-semibold">
        <Link href={getRootPath()}>
          <span className="text-neutral-500">powered by</span> typo{" "}
          <span className="text-blue-500">blue</span>
        </Link>
        {blog && (
          <span className="text-neutral-500 tabular-nums">
            HIT {blog.visitor_count.toLocaleString("ko-KR")}
          </span>
        )}
      </div>
    </footer>
  );
}
