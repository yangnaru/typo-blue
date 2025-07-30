"use client";

import { Button } from "@/components/ui/button";
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/actions/notifications";
import { toast } from "sonner";
import { useTransition } from "react";

interface NotificationActionsProps {
  blogSlug: string;
  notificationId?: string;
  isRead?: boolean;
  hasUnreadNotifications?: boolean;
}

export function NotificationActions({
  blogSlug,
  notificationId,
  isRead,
  hasUnreadNotifications,
}: NotificationActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handleMarkAsRead = () => {
    if (!notificationId) return;
    
    startTransition(async () => {
      try {
        await markNotificationAsRead(blogSlug, notificationId);
        toast.success("알림을 읽음으로 표시했습니다.");
      } catch (error) {
        toast.error("알림 상태 변경에 실패했습니다.");
      }
    });
  };

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      try {
        await markAllNotificationsAsRead(blogSlug);
        toast.success("모든 알림을 읽음으로 표시했습니다.");
      } catch (error) {
        toast.error("알림 상태 변경에 실패했습니다.");
      }
    });
  };

  if (notificationId && !isRead) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={handleMarkAsRead}
        disabled={isPending}
      >
        읽음으로 표시
      </Button>
    );
  }

  if (hasUnreadNotifications) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={handleMarkAllAsRead}
        disabled={isPending}
      >
        모든 알림 읽음 표시
      </Button>
    );
  }

  return null;
}