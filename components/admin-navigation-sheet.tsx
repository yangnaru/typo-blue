"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  ExternalLink,
  Mail,
  Orbit,
  PanelLeft,
  Settings,
  Type,
  Book,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getBlogAnalyticsPath,
  getBlogPostsPath,
  getBlogFediversePath,
  getBlogHomePath,
  getBlogNotificationsPath,
  getBlogSettingsPath,
  getBlogSubscribersPath,
} from "@/lib/paths";

interface AdminNavigationSheetProps {
  blogId: string;
  unreadNotificationCount: number;
}

export default function AdminNavigationSheet({
  blogId,
  unreadNotificationCount,
}: AdminNavigationSheetProps) {
  const [open, setOpen] = useState(false);

  const handleLinkClick = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="icon" variant="outline" className="sm:hidden">
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">메뉴 여닫기</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <SheetTitle className="sr-only">네비게이션 메뉴</SheetTitle>
        <nav className="flex flex-col gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Type className="h-6 w-6" />
          </div>
          <div className="border-t pt-4 space-y-2">
            <Link
              href={getBlogPostsPath(blogId)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={handleLinkClick}
            >
              <Book className="h-5 w-5" />글 목록
            </Link>
            <Link
              href={getBlogSubscribersPath(blogId)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={handleLinkClick}
            >
              <Mail className="h-5 w-5" />
              구독자
            </Link>
            <Link
              href={getBlogAnalyticsPath(blogId)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={handleLinkClick}
            >
              <BarChart3 className="h-5 w-5" />
              분석
            </Link>
            <Link
              href={getBlogFediversePath(blogId)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={handleLinkClick}
            >
              <Orbit className="h-5 w-5" />
              연합우주
            </Link>
            <Link
              href={getBlogNotificationsPath(blogId)}
              className="relative flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={handleLinkClick}
            >
              <Bell className="h-5 w-5" />
              {unreadNotificationCount > 0 && (
                <div className="absolute left-6 top-1 h-2 w-2 bg-destructive rounded-full"></div>
              )}
              알림
            </Link>
          </div>
          <div className="border-t pt-4 space-y-2 mt-auto">
            <Link
              href={getBlogHomePath(blogId)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={handleLinkClick}
            >
              <ExternalLink className="h-5 w-5" />
              블로그로 가기
            </Link>
            <Link
              href={getBlogSettingsPath(blogId)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={handleLinkClick}
            >
              <Settings className="h-5 w-5" />
              설정
            </Link>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
