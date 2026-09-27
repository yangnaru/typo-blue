import Link from "next/link";
import { getAboutPath, getDesignPath, getRootPath } from "@/lib/paths";

const SOURCE_URL = "https://github.com/yangnaru/typo-blue";

// The footer of the service's own pages, drawn like a blog's.
export default function SiteFooter() {
  return (
    <footer className="mt-8 mb-8 pt-3 border-t border-neutral-200 dark:border-neutral-800">
      <div className="flex flex-row flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <Link href={getRootPath()} className="font-semibold">
          typo <span className="text-blue-500">blue</span>
        </Link>
        <p className="text-neutral-500">
          <Link href={getAboutPath()}>소개</Link> ·{" "}
          <Link href={getDesignPath()}>디자인</Link> ·{" "}
          <a href={SOURCE_URL}>소스 코드</a>
        </p>
      </div>
    </footer>
  );
}
