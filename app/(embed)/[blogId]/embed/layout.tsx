import { Metadata } from "next";
import "../../../globals.css";
import { Inter } from "next/font/google";
import { db } from "@/lib/db";
import { blog } from "@/lib/schema";
import { eq } from "drizzle-orm";

const inter = Inter({ subsets: ["latin"] });

type Params = Promise<{ blogId: string }>;

export async function generateMetadata(props: {
  params: Params;
}): Promise<Metadata> {
  const blogId = decodeURIComponent((await props.params).blogId);
  if (!blogId.startsWith("@")) {
    return {
      title: "존재하지 않는 블로그입니다.",
    };
  }

  const slug = blogId.replace("@", "");
  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, slug),
    with: {
      user: true,
    },
  });

  if (!targetBlog) {
    return {
      title: "존재하지 않는 블로그입니다.",
    };
  }

  return {
    title: targetBlog.name ?? `@${targetBlog.slug}`,
    description: targetBlog.description,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_URL}/${blogId}`,
      types: {
        "application/atom+xml": [
          {
            title: targetBlog.name ?? blogId,
            url: `${process.env.NEXT_PUBLIC_URL}/${blogId}/feed.xml`,
          },
        ],
      },
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main>{children}</main>
      </body>
    </html>
  );
}
