import Link from "next/link";
import { ModeToggle } from "./mode-toggle";
import AccountDropdown from "./account-dropdown";
import { validateRequest } from "@/lib/auth";
import { Button } from "./ui/button";
import { getLoginPath } from "@/lib/paths";
import { prisma } from "@/lib/db";

export default async function Logo() {
  const { user } = await validateRequest();

  let blogs;
  if (user) {
    blogs = await prisma.blog.findMany({
      where: {
        userId: user.id,
      },
    });
  }

  return (
    <h1 className="flex flex-row justify-between items-center py-2">
      <Link href="/" className="text-xl font-extrabold">
        typo <span className="text-blue-500">blue</span>
      </Link>
      <div className="flex flex-row gap-2">
        {!user && (
          <Button asChild>
            <Link href={getLoginPath()}>로그인</Link>
          </Button>
        )}
        <ModeToggle />
        {user && <AccountDropdown user={user} blogs={blogs ?? []} />}
      </div>
    </h1>
  );
}
