import "../globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "타이포 블루",
  description: "타이포 블루는 글로 자신을 표현하는 공간입니다.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL!),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="mx-auto">
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
