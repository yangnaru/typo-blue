import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import AccountDropdown from "@/components/account-dropdown";
import { getBlogHomePath, getRootPath } from "@/lib/paths";

type BlogHeaderProps = {
  user?: any;
  userBlogs?: any[];
  blogSlug?: string;
  blogName?: string;
  isPostPage?: boolean;
};

export function BlogHeader({
  user,
  userBlogs,
  blogSlug,
  blogName,
  isPostPage,
}: BlogHeaderProps) {
  return (
    <header className="w-full border-b bg-background">
      <div className="max-w-4xl mx-auto flex h-14 items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          {isPostPage && blogSlug ? (
            <Link
              href={getBlogHomePath(blogSlug)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">
                {blogName || `@${blogSlug}`}
              </span>
            </Link>
          ) : (
            <Link href={getRootPath()} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">typo blue</span>
            </Link>
          )}
        </Button>
        <div className="flex items-center gap-2">
          <ModeToggle />
          {user && <AccountDropdown user={user} blogs={userBlogs ?? []} />}
        </div>
      </div>
    </header>
  );
}
