import "../../globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import Link from "next/link";
import {
  BarChart3,
  Cog,
  ExternalLink,
  Home,
  Mail,
  PanelLeft,
  Settings,
  Type,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import AccountDropdown from "@/components/account-dropdown";
import { redirect } from "next/navigation";
import {
  getBlogAnalyticsPath,
  getBlogDashboardPath,
  getBlogHomePath,
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

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "타이포 블루",
  description: "타이포 블루는 글로 자신을 표현하는 공간입니다.",
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

  let blogs;
  if (user) {
    blogs = await db.query.blog.findMany({
      where: eq(blog.userId, user.id),
    });
  }

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
              <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
                <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
                  <Link
                    href={getBlogDashboardPath(blogId)}
                    className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
                  >
                    <Type className="h-4 w-4 transition-all group-hover:scale-110" />
                    <span className="sr-only">@{blogId}</span>
                  </Link>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={getBlogDashboardPath(blogId)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                      >
                        <Home className="h-5 w-5" />
                        <span className="sr-only">대시보드</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">대시보드</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={getBlogSubscribersPath(blogId)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
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
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                      >
                        <BarChart3 className="h-5 w-5" />
                        <span className="sr-only">Analytics</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">Analytics</TooltipContent>
                  </Tooltip>
                </nav>
                <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={getBlogHomePath(blogId)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
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
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                      >
                        <Settings className="h-5 w-5" />
                        <span className="sr-only">설정</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">설정</TooltipContent>
                  </Tooltip>
                </nav>
              </aside>
              <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
                <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        className="sm:hidden"
                      >
                        <PanelLeft className="h-5 w-5" />
                        <span className="sr-only">메뉴 여닫기</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="sm:max-w-xs">
                      <nav className="grid gap-6 text-lg font-medium">
                        <Link
                          href={getBlogDashboardPath(blogId)}
                          className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                        >
                          <Type className="h-5 w-5 transition-all group-hover:scale-110" />
                          <span className="sr-only">typo.blue</span>
                        </Link>
                        <Link
                          href={getBlogDashboardPath(blogId)}
                          className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                        >
                          <Home className="h-5 w-5" />
                          대시보드
                        </Link>
                        <Link
                          href={getBlogSubscribersPath(blogId)}
                          className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                        >
                          <Mail className="h-5 w-5" />
                          구독자
                        </Link>
                        <Link
                          href={getBlogAnalyticsPath(blogId)}
                          className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                        >
                          <BarChart3 className="h-5 w-5" />
                          Analytics
                        </Link>
                        <Link
                          href={getBlogHomePath(blogId)}
                          className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-5 w-5" />
                          블로그로 가기
                        </Link>
                        <Link
                          href={getBlogSettingsPath(blogId)}
                          className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                        >
                          <Cog className="h-5 w-5" />
                          설정
                        </Link>
                      </nav>
                    </SheetContent>
                  </Sheet>
                  <div className="grid flex-1 items-start gap-4 md:gap-8 lg:grid-cols-3 xl:grid-cols-3">
                    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
                      <div className="flex flex-row gap-2 w-full justify-end">
                        <ModeToggle />
                        <AccountDropdown user={user} blogs={blogs ?? []} />
                      </div>
                    </div>
                  </div>
                </header>
                <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-3 xl:grid-cols-3">
                  <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
                    {children}
                  </div>
                </main>
              </div>
            </div>
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
