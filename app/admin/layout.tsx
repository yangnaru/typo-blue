import { connection } from "next/server";
import "../globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import MasqueradeBanner from "@/components/masquerade-banner";
import AdminSidebar from "./admin-sidebar";
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
          <div className="flex min-h-screen">
            <AdminSidebar />
            <main className="flex-1 overflow-x-auto p-6 md:p-8">
              <div className="mx-auto max-w-6xl">{children}</div>
            </main>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
