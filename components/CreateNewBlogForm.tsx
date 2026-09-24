"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BlogSlugInput from "./BlogSlugInput";
import { createBlog } from "@/lib/actions/blog";
import { PlainButton } from "@/components/plain-button";
import { getBlogHomePath } from "@/lib/paths";
import { inputClassName } from "@/lib/form-styles";

export default function CreateNewBlogForm() {
  const router = useRouter();
  const [form, setForm] = useState({ blogId: "" });
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setStatus("블로그 만드는 중...");

    try {
      const res = await createBlog(form.blogId);
      if (res.blogId) {
        // The server lowercases the ID
        router.push(getBlogHomePath(res.blogId));
        return;
      }
      setStatus(res.error ?? "알 수 없는 오류가 발생했습니다.");
    } catch {
      setStatus("알 수 없는 오류가 발생했습니다.");
    }
    setIsLoading(false);
  }

  return (
    <>
      <form
        className="flex flex-col float-left space-y-2"
        onSubmit={handleSubmit}
      >
        <h2 className="text-xl font-bold">새 블로그를 만듭니다.</h2>

        <BlogSlugInput
          value=""
          handleChange={(e) => setForm({ blogId: e.target.value })}
          className={inputClassName}
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
          <PlainButton type="submit" disabled={isLoading}>
            만들기
          </PlainButton>
          <p>{status}</p>
        </div>
      </form>
    </>
  );
}
