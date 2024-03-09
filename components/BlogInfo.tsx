"use client";

import format from "date-fns/format";
import Link from "next/link";
import LinkButton from "./LinkButton";
import { deleteBlog } from "@/lib/actions";
import { Blog } from "@prisma/client";

export default function BlogInfo({
  blog,
}: {
  blog: Blog & { posts: { id: number }[] };
}) {
  function handleDeleteBlog() {
    let confirmDelete;
    if (blog.posts.length !== 0) {
      confirmDelete =
        prompt(
          `정말 블로그 "${blog.slug}"를 삭제하시겠습니까?\n\n삭제하시려면 "${blog.slug}" 라고 입력해 주세요.`
        ) === blog.slug;
    } else {
      confirmDelete = true;
    }

    if (confirmDelete) {
      deleteBlog(blog.slug).then((data) => {
        if (data.status === "success") {
          alert("블로그가 삭제되었습니다.");
          window.location.href = "/account";
        } else {
          alert(`블로그 삭제에 실패했습니다: ${data.error}`);
        }
      });
    }
  }

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
        <button
          className="border border-red-500 rounded-sm p-1 hover:bg-red-300 hover:text-black w-24"
          onClick={handleDeleteBlog}
        >
          블로그 삭제
        </button>
      </div>
    </div>
  );
}
