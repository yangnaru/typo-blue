"use client";

import { useState } from "react";
import { editBlogInfo, deleteBlog } from "@/lib/actions/blog";
import { getAccountPath } from "@/lib/paths";
import { Button } from "./ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { inputClassName } from "@/lib/form-styles";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
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
    if (postCount === 0) {
      // If no posts, delete immediately
      const res = await deleteBlog(slug);
      if (res.success) {
        toast.success("블로그가 삭제되었습니다.");
        window.location.href = getAccountPath();
      } else {
        toast.error("블로그 삭제에 실패했습니다.");
      }
    } else {
      // If has posts, show confirmation dialog
      setDeleteDialogOpen(true);
    }
  }

  async function handleConfirmDelete() {
    if (postCount > 0 && confirmationInput !== blog.slug) {
      toast.error("블로그 이름을 정확히 입력해주세요.");
      return;
    }

    const res = await deleteBlog(slug);
    if (res.success) {
      toast.success("블로그가 삭제되었습니다.");
      window.location.href = getAccountPath();
    } else {
      toast.error("블로그 삭제에 실패했습니다.");
    }
    setDeleteDialogOpen(false);
    setConfirmationInput("");
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
    <div className="space-y-4">
      <h3 className="text-lg">블로그 정보 수정</h3>
      <form className="flex flex-col space-y-4 items-start">
        <div className="flex flex-col w-full">
          <label htmlFor="name">블로그 제목</label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="블로그 제목을 적어 주세요."
            className={`${inputClassName} p-2`}
            value={blog.name ?? ""}
            onChange={handleChange}
          />
        </div>
        <div className="flex flex-col w-full">
          <label htmlFor="description">블로그 설명</label>
          <textarea
            id="description"
            name="description"
            placeholder="블로그 설명을 적어 주세요."
            className={`${inputClassName} p-2`}
            value={blog.description ?? ""}
            onChange={handleChange}
            rows={3}
          />
        </div>
        <div className="flex flex-row items-center gap-2">
          <input
            type="checkbox"
            id="discoverable"
            name="discoverable"
            checked={blog.discoverable ?? false}
            onChange={(e) => handleDiscoverableChange(e.target.checked)}
          />
          <label htmlFor="discoverable">타이포 블루 메인에 새 글 노출</label>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>블로그 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              블로그 &quot;{slug}&quot;와 모든 글
              {postCount > 0 && ` ${postCount}개`}가 영구적으로 삭제되고, 연합우주
              연동 시 연합우주에도 삭제를 요청합니다. 이 작업은 되돌릴 수
              없습니다. 삭제하려면 &quot;{slug}&quot;를 입력해 주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            type="text"
            aria-label="삭제 확인 입력"
            className={inputClassName}
            placeholder={slug}
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmationInput("")}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={confirmationInput !== blog.slug}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
