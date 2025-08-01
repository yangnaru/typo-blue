import { db } from "@/lib/db";
import { blog } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import AccountDropdown from "@/components/account-dropdown";

export default async function BlogLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ blogId: string }>;
}) {
  const { user } = await getCurrentSession();
  
  let blogs;
  if (user) {
    blogs = await db.query.blog.findMany({
      where: eq(blog.userId, user.id),
    });
  }

  const blogId = decodeURIComponent((await params).blogId);
  if (!blogId.startsWith("@")) {
    notFound();
  }

  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogId.replace("@", "")),
  });

  return <BlogLayoutBody blog={targetBlog} user={user} userBlogs={blogs}>{children}</BlogLayoutBody>;
}

function BlogLayoutBody({
  children,
  blog,
  user,
  userBlogs,
}: {
  children: ReactNode;
  blog?: any;
  user?: any;
  userBlogs?: any[];
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with navigation and dark mode toggle */}
      <header className="w-full border-b bg-background">
        <div className="max-w-4xl mx-auto flex h-14 items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">홈으로</span>
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <ModeToggle />
            {user && <AccountDropdown user={user} blogs={userBlogs ?? []} />}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
