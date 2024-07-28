"use client";

import { useState } from "react";
import { editBlogInfo, deleteBlog } from "@/lib/actions/blog";
import { getAccountPath } from "@/lib/paths";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "./ui/checkbox";
import { toast } from "sonner";

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

  function handleDiscoverableChange(checked: boolean) {
    setBlog({
      ...blog,
      discoverable: checked,
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
        toast("블로그 삭제에 실패했습니다.");
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
      toast("블로그 정보가 수정되었습니다.");
    } else {
      toast("블로그 정보 수정에 실패했습니다.");
    }
  }

  return (
    <form>
      <Card x-chunk="dashboard-05-chunk-3">
        <CardHeader className="px-7">
          <CardTitle>블로그 설정</CardTitle>
          <CardDescription>각종 블로그 설정</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>블로그 제목</CardTitle>
              <CardDescription>블로그 제목을 적어 주세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                onChange={handleChange}
                name="name"
                value={blog.name ?? ""}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>블로그 설명</CardTitle>
              <CardDescription>블로그 설명을 적어 주세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                onChange={handleChange}
                name="description"
                value={blog.description ?? ""}
              />
            </CardContent>
          </Card>

          <div className="items-top flex space-x-2">
            <Checkbox
              name="discoverable"
              checked={blog.discoverable ?? false}
              onCheckedChange={(checked) => handleDiscoverableChange(!!checked)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="terms1"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                검색 및 발견 허용
              </label>
              <p className="text-sm text-muted-foreground">
                타이포 블루 메인에 노출되거나 검색 엔진에 의해 발견될 수
                있습니다.
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <div className="flex flex-row gap-2">
            <Button type="submit" onClick={(e) => handleSubmit(e)}>
              저장
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              블로그 삭제
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
