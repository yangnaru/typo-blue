"use client";

import { useState } from "react";
import { editBlogInfo, deleteBlog } from "@/lib/actions/blog";
import { getAccountPath } from "@/lib/paths";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
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
import { Save, Trash2, Settings, Globe, Lock } from "lucide-react";

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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6" />
        <h1 className="text-3xl font-bold">블로그 설정</h1>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>
            블로그의 기본 정보와 공개 설정을 관리하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Basic Information Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">기본 정보</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  블로그 제목
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="블로그 제목을 입력하세요"
                  value={blog.name ?? ""}
                  onChange={handleChange}
                />
                <p className="text-sm text-muted-foreground">
                  독자들에게 표시될 블로그의 제목입니다.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  블로그 설명
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="블로그에 대한 간단한 설명을 적어주세요"
                  value={blog.description ?? ""}
                  onChange={handleChange}
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  블로그의 주제나 목적에 대한 간단한 설명입니다.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Privacy Settings Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">공개 설정</h3>
            </div>

            <div className="flex items-start gap-4 rounded-lg bg-muted/50 p-4">
              <Checkbox
                id="discoverable"
                checked={blog.discoverable ?? false}
                onCheckedChange={(checked) =>
                  handleDiscoverableChange(!!checked)
                }
                className="mt-1"
              />
              <div className="space-y-2">
                <Label
                  htmlFor="discoverable"
                  className="text-sm font-medium cursor-pointer"
                >
                  타이포 블루 메인에 노출 허용
                </Label>
                <p className="text-sm text-muted-foreground">
                  활성화하면 새 글이 타이포 블루 메인 페이지에 노출되어 더 많은
                  독자들이 발견할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <Button
            onClick={handleSubmit}
            className="flex items-center gap-2"
            size="default"
          >
            <Save className="h-4 w-4" />
            <span>변경사항 저장</span>
          </Button>
        </CardFooter>
      </Card>

      {/* Danger Zone Section */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-destructive">
            <Trash2 className="h-5 w-5" />
            <span>위험 구역</span>
          </CardTitle>
          <CardDescription className="text-destructive/80">
            신중하게 진행하세요. 이 작업들은 되돌릴 수 없습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-semibold text-destructive">
              블로그 삭제
            </h4>
            <p className="text-sm text-destructive/80">
              블로그와 모든 게시물을 영구적으로 삭제합니다.
              {postCount > 0 && ` 현재 ${postCount}개의 게시물이 있습니다.`} 이
              작업은 되돌릴 수 없습니다.
            </p>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              블로그 삭제
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              <span>블로그 삭제</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>정말 블로그 &quot;{slug}&quot;를 삭제하시겠습니까?</p>

              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-destructive font-semibold text-sm">
                  ⚠️ 주의사항
                </p>
                <ul className="text-sm space-y-1 mt-2">
                  <li>• 이 작업은 되돌릴 수 없습니다</li>
                  <li>• 모든 게시물이 함께 삭제됩니다</li>
                  {postCount > 0 && (
                    <li>• 현재 {postCount}개의 게시물이 삭제됩니다</li>
                  )}
                  <li>• ActivityPub 연동 시 연합우주에서도 삭제 요청됩니다</li>
                </ul>
              </div>

              <p>
                삭제하시려면 블로그 이름 &quot;{slug}&quot;를 아래에 정확히
                입력해주세요.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirmation-input" className="text-sm font-medium">
              확인 입력
            </Label>
            <Input
              id="confirmation-input"
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
              <Trash2 className="h-4 w-4 mr-2" />
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
