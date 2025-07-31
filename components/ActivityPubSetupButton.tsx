"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { setupActivityPubActorForBlog } from "@/lib/actions/activitypub";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ActivityPubSetupButtonProps {
  blogSlug: string;
}

export function ActivityPubSetupButton({ blogSlug }: ActivityPubSetupButtonProps) {
  const [setting, setSetting] = useState(false);
  const router = useRouter();

  const handleSetupActivityPub = async () => {
    setSetting(true);
    try {
      const result = await setupActivityPubActorForBlog(blogSlug);
      if (result.success) {
        toast.success("ActivityPub 연합이 성공적으로 활성화되었습니다!");
        // Refresh the page to show the updated profile
        router.refresh();
      } else {
        toast.error(result.error || "ActivityPub 프로필 설정에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to setup ActivityPub:", error);
      toast.error("ActivityPub 프로필 설정에 실패했습니다");
    } finally {
      setSetting(false);
    }
  };

  return (
    <Button 
      onClick={handleSetupActivityPub}
      disabled={setting}
      className="w-full"
    >
      {setting ? "설정 중..." : "ActivityPub 연합 활성화"}
    </Button>
  );
}