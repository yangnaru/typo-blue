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
import { User as UserIcon, BookOpen, LayoutDashboard, PenTool } from "lucide-react";
import Link from "next/link";
import { logout } from "@/lib/actions/account";
import { getAccountPath, getBlogHomePath, getBlogPostsPath, getBlogNewPostPath } from "@/lib/paths";

export default function AccountDropdown({
  user,
  blogs,
}: {
  user: any;
  blogs: any;
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

        {blogs.map((blog: any) => (
          <div key={blog.id}>
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link
                href={getBlogHomePath(blog.slug)}
                className="flex items-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                {blog.name || "제목 없는 블로그"} (@{blog.slug})
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link
                href={getBlogPostsPath(blog.slug)}
                className="flex items-center gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />글 목록
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link
                href={getBlogNewPostPath(blog.slug)}
                className="flex items-center gap-2"
              >
                <PenTool className="h-4 w-4" />새 글 작성
              </Link>
            </DropdownMenuItem>
          </div>
        ))}
        {blogs.length > 0 && <DropdownMenuSeparator />}

        <DropdownMenuItem className="cursor-pointer" asChild>
          <Link href={getAccountPath()}>내 계정</Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={logout}>
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
