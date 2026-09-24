import Link from "next/link";
import { ModeToggle } from "./mode-toggle";
import AccountLinks from "./account-links";
import { Pill, PillItem } from "./pill";
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
    <header className="flex flex-row flex-wrap justify-between items-center gap-2 py-2">
      <h1 className="shrink-0 whitespace-nowrap">
        <Link href="/" className="text-xl font-extrabold">
          typo <span className="text-blue-500">blue</span>
        </Link>
      </h1>
      <nav aria-label="계정" className="max-w-full text-sm">
        <Pill>
          {user ? (
            <AccountLinks blogs={blogs ?? []} />
          ) : (
            <PillItem asChild>
              <Link href={getLoginPath()}>로그인</Link>
            </PillItem>
          )}
          <ModeToggle />
        </Pill>
      </nav>
    </header>
  );
}
