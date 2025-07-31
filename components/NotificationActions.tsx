"use client";

import { Button } from "@/components/ui/button";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "@/lib/actions/notifications";
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

  const handleDelete = () => {
    if (!notificationId) return;

    startTransition(async () => {
      try {
        await deleteNotification(blogSlug, notificationId);
        toast.success("알림을 삭제했습니다.");
      } catch (error) {
        toast.error("알림 삭제에 실패했습니다.");
      }
    });
  };

  if (notificationId) {
    return (
      <div className="flex gap-2">
        {!isRead && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAsRead}
            disabled={isPending}
          >
            읽음 표시
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={handleDelete}
          disabled={isPending}
        >
          삭제
        </Button>
      </div>
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
