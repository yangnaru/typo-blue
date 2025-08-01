"use client";

import { useState, useTransition } from "react";
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
import { Button } from "@/components/ui/button";
import { disableFederationForBlog } from "@/lib/actions/activitypub";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DisableFederationButtonProps {
  blogSlug: string;
}

export function DisableFederationButton({
  blogSlug,
}: DisableFederationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDisableFederation = () => {
    startTransition(async () => {
      try {
        const result = await disableFederationForBlog(blogSlug);

        if (result.success) {
          toast.success(
            result.message || "연합우주가 성공적으로 비활성화되었습니다."
          );
          setIsOpen(false);
          router.refresh(); // Refresh the page to update the UI
        } else {
          toast.error(result.error || "연합우주 비활성화에 실패했습니다.");
        }
      } catch (error) {
        console.error("Failed to disable federation:", error);
        toast.error("연합우주 비활성화에 실패했습니다.");
      }
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">연합우주 비활성화</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>연합우주 비활성화</AlertDialogTitle>
          <AlertDialogDescription>
            이 작업은 되돌릴 수 없습니다. 다음과 같은 작업이 수행됩니다:
            <br />
            <br />
            <div className="space-y-1">
              • 연합우주에 게시물 삭제 요청을 보냅니다.
              <br />
              • 연합우주의 특성 상, 모든 게시물이 삭제되지 않을 수 있습니다.
              <br />
              • 모든 팔로워와의 연결이 해제됩니다.
              <br />
              • ActivityPub 프로필이 완전히 제거됩니다.
              <br /> <br />
            </div>
            정말로 연합우주를 비활성화하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDisableFederation}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "비활성화 중..." : "비활성화"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
