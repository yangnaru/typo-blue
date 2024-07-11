"use client";

import format from "date-fns/format";
import Link from "next/link";
import LinkButton from "./LinkButton";
import { Blog } from "@prisma/client";

export default function BlogInfo({
  blog,
}: {
  blog: Blog & { posts: { uuid: string }[] };
}) {
  return (
    <div className="border rounded-sm p-2 space-y-2 flex flex-row place-content-between items-center">
      <div className="space-y-1">
        <p className="font-semibold underline">
          <Link href={`/@${blog.slug}`}>
            @{blog.slug} {blog.name && `(${blog.name})`}
          </Link>
        </p>
        <p>개설일: {format(new Date(blog.createdAt), "yyyy년 M월 d일")}</p>
        <p>글 수: {blog.posts.length}</p>
      </div>
      <div className="flex flex-col space-y-2 items-end">
        <LinkButton href={`/@${blog.slug}/edit`} className="w-24 text-center">
          정보 수정
        </LinkButton>
      </div>
    </div>
  );
}
