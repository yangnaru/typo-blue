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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
                타이포 블루 메인에 노출 허용
              </label>
              <p className="text-sm text-muted-foreground">
                새 글이 타이포 블루 메인에 노출될 수 있습니다.
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>블로그 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말 블로그 &quot;{slug}&quot;를 삭제하시겠습니까?
              <br />
              <br />
              <span className="text-destructive font-semibold">
                주의: 이 블로그가 ActivityPub(연합우주)에 연동되어 있다면,
                블로그 삭제 시 연합우주에서도 프로필과 게시물이 삭제 요청됩니다.
                <br />
                연합우주의 특성상, 모든 게시물이 완전히 삭제되지 않을 수
                있습니다.
              </span>
              <br />
              <br />이 작업은 되돌릴 수 없습니다. 삭제하시려면 블로그 이름
              &quot;
              {slug}&quot;를 아래에 정확히 입력해주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Input
              placeholder={`"${slug}" 입력`}
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
            />
          </div>
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
    </form>
  );
}
