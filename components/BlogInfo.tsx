"use client";

import { format } from "date-fns";
import Link from "next/link";
import { getBlogPostsPath, getBlogHomePath } from "@/lib/paths";
import { Button } from "./ui/button";

export default function BlogInfo({ blog }: { blog: any }) {
  return (
    <div className="border rounded-lg p-6 flex flex-row justify-between items-start gap-6">
      <div className="space-y-3 flex-1">
        <div>
          <Link
            href={getBlogHomePath(blog.slug)}
            className="text-lg font-semibold hover:underline"
          >
            @{blog.slug} {blog.name && `(${blog.name})`}
          </Link>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>개설일: {format(new Date(blog.created), "yyyy년 M월 d일")}</p>
          <p>글 수: {blog.posts.length}개</p>
        </div>
      </div>
      <div className="flex-shrink-0">
        <Button asChild>
          <Link href={getBlogPostsPath(blog.slug)}>블로그 관리</Link>
        </Button>
      </div>
    </div>
  );
}
