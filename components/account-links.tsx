"use client";

import Link from "next/link";
import { logout } from "@/lib/actions/account";
import { getAccountPath, getBlogHomePath } from "@/lib/paths";
import { PillItem } from "@/components/pill";
import type { Blog } from "@/lib/db";

export default function AccountLinks({
  blogs,
}: {
  blogs: Pick<Blog, "id" | "slug">[];
}) {
  return (
    <>
      {blogs.map((blog) => (
        <PillItem key={blog.id} asChild>
          <Link href={getBlogHomePath(blog.slug)}>
            {blogs.length === 1 ? "내 블로그" : `@${blog.slug}`}
          </Link>
        </PillItem>
      ))}
      <PillItem asChild>
        <Link href={getAccountPath()}>내 계정</Link>
      </PillItem>
      <PillItem onClick={() => logout()}>로그아웃</PillItem>
    </>
  );
}
