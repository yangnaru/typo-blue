"use client";

import { useState } from "react";
import { editBlogInfo, deleteBlog } from "@/lib/actions/blog";
import { getAccountPath } from "@/lib/paths";
import { Button } from "./ui/button";

interface Blog {
  slug: string;
  name: string;
  description: string;
  discoverable: boolean;
}

export default function BlogEditForm({
  slug,
  name,
  description,
  discoverable,
  postCount,
}: Blog & {
  postCount: number;
}) {
  const [blog, setBlog] = useState<Blog>({
    slug,
    name,
    description,
    discoverable,
  });

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setBlog({
      ...blog,
      [event.target.name]: event.target.value,
    });
  }

  function handleDiscoverableChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setBlog({
      ...blog,
      [event.target.name]: event.target.checked,
    });
  }

  async function handleDelete() {
    let confirmDelete;
    if (postCount !== 0) {
      confirmDelete =
        prompt(
          `정말 블로그 "${slug}"를 삭제하시겠습니까?\n\n삭제하시려면 "${slug}" 라고 입력해 주세요.`
        ) === blog.slug;
    } else {
      confirmDelete = true;
    }

    if (confirmDelete) {
      const res = await deleteBlog(slug);

      if (res.success) {
        alert("블로그가 삭제되었습니다.");

        window.location.href = getAccountPath();
      } else {
        alert("블로그 삭제에 실패했습니다.");
      }
    }
  }

  async function handleSubmit(
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    e.preventDefault();

    const res = await editBlogInfo(
      blog.slug,
      blog.name,
      blog.description,
      blog.discoverable
    );

    if (res.success) {
      alert("블로그 정보가 수정되었습니다.");
    } else {
      alert("블로그 정보 수정에 실패했습니다.");
    }

    window.location.reload();
  }

  return (
    <form className="flex flex-col space-y-4 items-start">
      <div className="flex flex-col">
        <label htmlFor="name">블로그 제목</label>
        <input
          type="text"
          placeholder="블로그 제목을 적어 주세요."
          className="p-2 dark:text-white dark:bg-black border dark:border-white border-black rounded-sm"
          onChange={handleChange}
          name="name"
          value={blog.name ?? ""}
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="description">블로그 설명</label>
        <input
          type="text"
          placeholder="블로그 설명을 적어 주세요."
          className="p-2 dark:text-white dark:bg-black border dark:border-white border-black rounded-sm"
          onChange={handleChange}
          name="description"
          value={blog.description ?? ""}
        />
      </div>
      <div className="flex flex-row items-center gap-4">
        <label htmlFor="description">검색 및 발견 허용</label>
        <input
          type="checkbox"
          placeholder="블로그 검색 및 발견 허용 여부를 체크해 주세요."
          className="p-2 dark:text-white dark:bg-black border dark:border-white border-black rounded-sm"
          onChange={handleDiscoverableChange}
          name="discoverable"
          checked={blog.discoverable ?? false}
        />
      </div>
      <div className="flex flex-row gap-2">
        <Button type="submit" onClick={(e) => handleSubmit(e)}>
          저장
        </Button>
        <Button type="button" variant="destructive" onClick={handleDelete}>
          블로그 삭제
        </Button>
      </div>
    </form>
  );
}
