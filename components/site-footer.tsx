import Link from "next/link";
import { getDesignPath, getRootPath } from "@/lib/paths";

const SOURCE_URL = "https://github.com/yangnaru/typo-blue";

// The footer of the service's own pages, drawn like a blog's.
export default function SiteFooter() {
  return (
    <footer className="py-8">
      <hr className="bg-neutral-500" />
      <div className="flex flex-row items-center justify-between text-sm font-semibold">
        <Link href={getRootPath()}>
          typo <span className="text-blue-500">blue</span>
        </Link>
        <p className="text-neutral-500">
          <Link href={getDesignPath()}>디자인</Link> ·{" "}
          <a href={SOURCE_URL}>소스 코드</a>
        </p>
      </div>
    </footer>
  );
}
