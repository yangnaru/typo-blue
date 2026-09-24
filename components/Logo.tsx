import Link from "next/link";
import { ModeToggle } from "./mode-toggle";
import AccountLinks from "./account-links";
import { getCurrentSession } from "@/lib/auth";
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
    <header className="flex flex-row justify-between items-center gap-4 py-2">
      <h1>
        <Link href="/" className="text-xl font-extrabold">
          typo <span className="text-blue-500">blue</span>
        </Link>
      </h1>
      <nav className="flex flex-row flex-wrap justify-end gap-x-3 text-sm">
        {user ? (
          <AccountLinks blogs={blogs ?? []} />
        ) : (
          <Link href={getLoginPath()} className="text-blue-500">
            로그인
          </Link>
        )}
        <ModeToggle />
      </nav>
    </header>
  );
}
