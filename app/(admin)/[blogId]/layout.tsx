import { connection } from "next/server";
import "../../globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import Link from "next/link";
import Logo from "@/components/Logo";
import OwnerNav from "@/components/owner-nav";
import MasqueradeBanner from "@/components/masquerade-banner";
import { notFound, redirect } from "next/navigation";
import { getBlogHomePath, getRootPath } from "@/lib/paths";
import { Toaster } from "@/components/ui/sonner";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { blog } from "@/drizzle/schema";
import { getUnreadNotificationCount } from "@/lib/actions/notifications";
import { Metadata } from "next";
import { SELF_DESCRIPTION } from "@/lib/const";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  await connection();

  return {
    title: "타이포 블루",
    description: `${SELF_DESCRIPTION}.`,
    metadataBase: new URL(process.env.NEXT_PUBLIC_URL!),
  };
}

export default async function RootLayout({
  params,
  children,
}: {
  params: Promise<{
    blogId: string;
  }>;
  children: React.ReactNode;
}) {
  await connection();

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

  const isFederationEnabled = !!currentBlog.actor;
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
          <MasqueradeBanner />
          <div className="mx-auto max-w-prose p-2">
            <Logo />
            <div className="my-4 space-y-2">
              <h2 className="text-2xl font-bold break-keep">
                <Link href={getBlogHomePath(currentBlog.slug)}>
                  {currentBlog.name || `@${currentBlog.slug}`}
                </Link>
              </h2>
              <OwnerNav
                slug={currentBlog.slug}
                isFederationEnabled={isFederationEnabled}
                unreadNotificationCount={unreadNotificationCount}
              />
            </div>
            <main>{children}</main>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
