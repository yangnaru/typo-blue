import "../../globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  ExternalLink,
  Mail,
  Settings,
  Type,
  Book,
  Orbit,
} from "lucide-react";

import AdminNavigationSheet from "@/components/admin-navigation-sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import AccountDropdown from "@/components/account-dropdown";
import { notFound, redirect } from "next/navigation";
import {
  getBlogAnalyticsPath,
  getBlogPostsPath,
  getBlogFediversePath,
  getBlogHomePath,
  getBlogNotificationsPath,
  getBlogSettingsPath,
  getBlogSubscribersPath,
  getRootPath,
} from "@/lib/paths";
import { ModeToggle } from "@/components/mode-toggle";
import { Toaster } from "@/components/ui/sonner";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { blog } from "@/drizzle/schema";
import { getUnreadNotificationCount } from "@/lib/actions/notifications";
import { SELF_DESCRIPTION } from "@/lib/const";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "타이포 블루",
  description: `${SELF_DESCRIPTION}.`,
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL!),
};

export default async function RootLayout({
  params,
  children,
}: {
  params: {
    blogId: string;
  };
  children: React.ReactNode;
}) {
  const { user } = await getCurrentSession();
  const blogId = decodeURIComponent((await params).blogId).replace("@", "");

  if (!user) {
    redirect(getRootPath());
  }

  const currentBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogId),
    with: {
      actor: true,
      user: true,
    },
  });

  if (!currentBlog) {
    notFound();
  }

  if (currentBlog.user.id !== user.id) {
    redirect(getRootPath());
  }

  const activityPubEnabled = !!currentBlog.actor;
  const unreadNotificationCount = await getUnreadNotificationCount(blogId);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
              <aside className="fixed inset-y-0 left-0 z-10 hidden w-16 flex-col border-r bg-background sm:flex">
                <div className="flex flex-col items-center gap-3 px-3 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Type className="h-5 w-5" />
                  </div>
                </div>
                <nav className="flex flex-col items-center gap-3 px-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={getBlogPostsPath(blogId)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
                      >
                        <Book className="h-5 w-5" />
                        <span className="sr-only">글 목록</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">글 목록</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={getBlogSubscribersPath(blogId)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
                      >
                        <Mail className="h-5 w-5" />
                        <span className="sr-only">구독자</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">구독자</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={getBlogAnalyticsPath(blogId)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
                      >
                        <BarChart3 className="h-5 w-5" />
                        <span className="sr-only">분석</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">분석</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={getBlogFediversePath(blogId)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
                      >
                        <Orbit className="h-5 w-5" />
                        <span className="sr-only">연합우주</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">연합우주</TooltipContent>
                  </Tooltip>
                  {activityPubEnabled && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={getBlogNotificationsPath(blogId)}
                          className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
                        >
                          <Bell className="h-5 w-5" />
                          {unreadNotificationCount > 0 && (
                            <div className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full border-2 border-background"></div>
                          )}
                          <span className="sr-only">알림</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">알림</TooltipContent>
                    </Tooltip>
                  )}
                </nav>
                <nav className="mt-auto flex flex-col items-center gap-3 px-3 py-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={getBlogHomePath(blogId)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
                      >
                        <ExternalLink className="h-5 w-5" />
                        <span className="sr-only">블로그로 가기</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">블로그로 가기</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={getBlogSettingsPath(blogId)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
                      >
                        <Settings className="h-5 w-5" />
                        <span className="sr-only">설정</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">설정</TooltipContent>
                  </Tooltip>
                </nav>
              </aside>
              <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-16">
                <header className="flex h-14 items-center justify-between border-b px-4 sm:h-auto sm:border-0 sm:px-6">
                  <AdminNavigationSheet
                    blogId={blogId}
                    activityPubEnabled={activityPubEnabled}
                    unreadNotificationCount={unreadNotificationCount}
                  />
                  <div className="flex items-center gap-2 ml-auto">
                    <ModeToggle />
                    <AccountDropdown user={user} blogs={[currentBlog]} />
                  </div>
                </header>
                <main className="flex-1 p-4 sm:p-6">{children}</main>
              </div>
            </div>
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
