"use client";

import Link from "next/link";
import { logout } from "@/lib/actions/account";
import { getAccountPath, getBlogHomePath } from "@/lib/paths";
import { linkButtonClassName } from "@/lib/form-styles";
import type { Blog } from "@/lib/db";

export default function AccountLinks({
  blogs,
}: {
  blogs: Pick<Blog, "id" | "slug">[];
}) {
  return (
    <>
      {blogs.map((blog) => (
        <Link
          key={blog.id}
          href={getBlogHomePath(blog.slug)}
          className="text-blue-500"
        >
          {blogs.length === 1 ? "내 블로그" : `@${blog.slug}`}
        </Link>
      ))}
      <Link href={getAccountPath()} className="text-blue-500">
        내 계정
      </Link>
      <button
        type="button"
        className={linkButtonClassName}
        onClick={() => logout()}
      >
        로그아웃
      </button>
    </>
  );
}
