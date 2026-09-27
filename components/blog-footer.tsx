import Link from "next/link";
import { getBlogFeedPath, getBlogHomePath, getRootPath } from "@/lib/paths";

// The end of every page of a blog: whose blog it is and the ways to follow it,
// then typo blue and the visit count on one small line.
export default function BlogFooter({
  blog,
  fediverseHandle,
  showSubscribe,
}: {
  blog: { slug: string; name: string | null; visitor_count: number } | null;
  fediverseHandle: string | null;
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
          <p className="text-neutral-500 text-sm">
            {showSubscribe && (
              <>
                <Link
                  href={`${getBlogHomePath(blog.slug)}#subscribe`}
                  className="underline"
                >
                  메일 구독
                </Link>
                {" · "}
              </>
            )}
            <a href={getBlogFeedPath(blog.slug)} className="underline">
              피드
            </a>
            {fediverseHandle && (
              <>
                {" · "}
                <code className="text-xs font-mono break-all select-all">
                  {fediverseHandle}
                </code>
              </>
            )}
          </p>
        </div>
      )}
      <div className="flex flex-row items-baseline justify-between gap-3 text-xs text-neutral-500">
        <Link href={getRootPath()}>
          typo <span className="text-blue-500">blue</span>로 만든 블로그
        </Link>
        {blog && (
          <span className="tabular-nums">
            방문 {blog.visitor_count.toLocaleString("ko-KR")}
          </span>
        )}
      </div>
    </footer>
  );
}
