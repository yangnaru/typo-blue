"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User as UserIcon } from "lucide-react";
import Link from "next/link";
import { logout } from "@/lib/actions/account";
import { getAccountPath } from "@/lib/paths";
import { Blog, User } from "@/lib/schema";

export default function AccountDropdown({
  user,
  blogs,
}: {
  user: User;
  blogs: Blog[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <UserIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="mx-2">
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {blogs.map((blog) => (
          <DropdownMenuItem key={blog.id} className="cursor-pointer" asChild>
            <Link href={`/@${blog.slug}`}>
              {blog.name || "제목 없는 블로그"} (@{blog.slug})
            </Link>
          </DropdownMenuItem>
        ))}
        {blogs.length > 0 && <DropdownMenuSeparator />}

        <DropdownMenuItem className="cursor-pointer" asChild>
          <Link href={getAccountPath()}>내 계정</Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" asChild>
          <form
            action={async () => {
              await logout();
            }}
          >
            <button>로그아웃</button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
