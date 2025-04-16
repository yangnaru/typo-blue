import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getBlogHomePath } from "@/lib/paths";
import { blog } from "@/lib/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ReactNode } from "react";

export default async function BlogLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { blogId: string };
}) {
  const blogId = decodeURIComponent(params.blogId);
  if (!blogId.startsWith("@")) {
    return <BlogLayoutBody>👀</BlogLayoutBody>;
  }

  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, blogId.replace("@", "")),
    with: {
      followings: {
        with: {
          following: true,
        },
      },
    },
  });

  return (
    <BlogLayoutBody blog={targetBlog}>
      {targetBlog && (
        <div className="my-8 flex flex-row flex-wrap items-baseline break-keep">
          {targetBlog && (
            <>
              <h2 className="text-2xl font-bold mr-2">
                <Link href={`/@${targetBlog.slug}`}>
                  {!targetBlog.name || targetBlog.name === ""
                    ? `@${targetBlog.slug}`
                    : targetBlog.name}
                </Link>
              </h2>

              {blog.description && (
                <p className="text-neutral-500">{targetBlog.description}</p>
              )}
            </>
          )}
        </div>
      )}
      {children}
      {targetBlog?.followings && targetBlog.followings.length > 0 && (
        <div className="mt-8">
          <hr className="bg-neutral-500" />
          <div className="mt-8 space-y-4">
            <h2 className="text-xl font-bold">파도타기</h2>
            <div className="flex flex-row flex-wrap items-baseline break-keep gap-2">
              {targetBlog.followings.map((following) => (
                <Button
                  key={following.following.slug}
                  variant="outline"
                  asChild
                >
                  <Link href={getBlogHomePath(following.following.slug)}>
                    @{following.following.slug}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </BlogLayoutBody>
  );
}

function BlogLayoutBody({
  children,
  blog,
}: {
  children: ReactNode;
  blog?: Blog | null;
}) {
  return (
    <>
      {children}
      <h1 className="py-8 bottom-0">
        <hr className="bg-neutral-500" />
        <div className="flex flex-row items-center justify-between text-sm font-semibold">
          <Link href="/">
            <span className="text-neutral-500">powered by</span> typo{" "}
            <span className="text-blue-500">blue</span>
          </Link>
          {blog && (
            <p className="text-neutral-500">total {blog.visitorCount}</p>
          )}
        </div>
      </h1>
    </>
  );
}
