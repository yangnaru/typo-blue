import { connection } from "next/server";
import "../globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SELF_DESCRIPTION } from "@/lib/const";
import { Metadata } from "next";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(props: {
  params: Promise<{ blogId: string }>;
}): Promise<Metadata> {
  await connection();

  return {
    title: "타이포 블루",
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
          <div className="mx-auto max-w-prose p-2">
            <main>{children}</main>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
