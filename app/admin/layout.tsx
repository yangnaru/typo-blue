import { connection } from "next/server";
import "../globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import MasqueradeBanner from "@/components/masquerade-banner";
import Logo from "@/components/Logo";
import PlainNav from "@/components/plain-nav";
import { SELF_DESCRIPTION } from "@/lib/const";
import { Metadata } from "next";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  await connection();

  return {
    title: "타이포 블루 · 관리자",
    description: `${SELF_DESCRIPTION}.`,
    metadataBase: new URL(process.env.NEXT_PUBLIC_URL!),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

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
              <h2 className="text-2xl font-bold">관리자</h2>
              <PlainNav
                label="관리자"
                links={[
                  { href: "/admin", label: "대시보드" },
                  { href: "/admin/users", label: "사용자", matchPrefix: true },
                  {
                    href: "/admin/email-queue",
                    label: "이메일 큐",
                    matchPrefix: true,
                  },
                ]}
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
