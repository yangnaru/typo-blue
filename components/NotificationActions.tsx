"use client";

import { linkButtonClassName } from "@/lib/form-styles";
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
      } catch {
        toast.error("알림 상태 변경에 실패했습니다.");
      }
    });
  };

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      try {
        await markAllNotificationsAsRead(blogSlug);
        toast.success("모든 알림을 읽음으로 표시했습니다.");
      } catch {
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
      } catch {
        toast.error("알림 삭제에 실패했습니다.");
      }
    });
  };

  if (notificationId) {
    return (
      <div className="flex flex-row gap-3 text-sm">
        {!isRead && (
          <button
            type="button"
            className={linkButtonClassName}
            onClick={handleMarkAsRead}
            disabled={isPending}
          >
            읽음 표시
          </button>
        )}
        <button
          type="button"
          className={linkButtonClassName}
          onClick={handleDelete}
          disabled={isPending}
        >
          삭제
        </button>
      </div>
    );
  }

  if (hasUnreadNotifications) {
    return (
      <button
        type="button"
        className={`${linkButtonClassName} text-sm`}
        onClick={handleMarkAllAsRead}
        disabled={isPending}
      >
        모두 읽음 표시
      </button>
    );
  }

  return null;
}
