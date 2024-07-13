"use client";

import { useState } from "react";
import BlogSlugInput from "./BlogSlugInput";
import { createBlog } from "@/lib/actions/blog";
import { Button } from "./ui/button";

export default function CreateNewBlogForm() {
  const [form, setForm] = useState({ blogId: "" });
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleSubmit() {
    setIsLoading(true);
    setStatus("블로그 만드는 중...");

    createBlog(form.blogId).then(async (res) => {
      if (!res.error) {
        window.location.href = `/@${form.blogId}`;
      } else {
        setIsLoading(false);
        setStatus(res.error);
      }
    });
  }

  return (
    <>
      <form className="flex flex-col float-left space-y-2">
        <h2 className="text-xl font-bold">새 블로그를 만듭니다.</h2>

        <BlogSlugInput
          value=""
          handleChange={(e) => setForm({ blogId: e.target.value })}
          className="p-2 dark:text-white dark:bg-black border dark:border-white border-black rounded-sm"
        />
        <div>
          <p className="text-neutral-500">
            블로그 ID는 영문, 숫자, 밑줄만 사용할 수 있습니다.
          </p>
          <p className="text-neutral-500">
            블로그 주소:{" "}
            {`${process.env.NEXT_PUBLIC_DOMAIN}/@${
              form.blogId === "" ? "blog" : form.blogId
            }`}
          </p>
        </div>

        <div className="flex flex-row items-baseline space-x-2">
          <Button disabled={isLoading} onClick={handleSubmit}>
            만들기
          </Button>
          <p>{status}</p>
        </div>
      </form>
    </>
  );
}
