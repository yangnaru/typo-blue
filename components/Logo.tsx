import Link from "next/link";
import { ModeToggle } from "./mode-toggle";
import AccountDropdown from "./account-dropdown";
import { getCurrentSession } from "@/lib/auth";
import { Button } from "./ui/button";
import { getLoginPath } from "@/lib/paths";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { blog } from "@/drizzle/schema";

export default async function Logo() {
  const { user } = await getCurrentSession();

  let blogs;
  if (user) {
    blogs = await db.query.blog.findMany({
      where: eq(blog.userId, user.id),
    });
  }

  return (
    <header className="flex flex-row justify-between items-center py-4 border-b">
      <Link href="/" className="text-2xl font-bold tracking-tight text-foreground hover:opacity-80 transition-opacity">
        typo <span className="text-primary">blue</span>
      </Link>
      <div className="flex flex-row gap-2 items-center">
        {!user && (
          <Button asChild>
            <Link href={getLoginPath()}>로그인 / 회원 가입</Link>
          </Button>
        )}
        <ModeToggle />
        {user && <AccountDropdown user={user} blogs={blogs ?? []} />}
      </div>
    </header>
  );
}
