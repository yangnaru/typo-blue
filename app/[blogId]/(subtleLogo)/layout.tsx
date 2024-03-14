import { prisma } from "@/lib/db";
import { Blog } from "@prisma/client";
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

  const blog = await prisma.blog.findUnique({
    where: {
      slug: blogId.replace("@", ""),
    },
    include: {
      posts: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  return (
    <BlogLayoutBody blog={blog}>
      {blog && (
        <div className="my-8 flex flex-row flex-wrap items-baseline break-keep">
          {blog && (
            <>
              <h2 className="text-2xl font-bold mr-2">
                <Link href={`/@${blog.slug}`}>
                  {!blog.name || blog.name === "" ? `@${blog.slug}` : blog.name}
                </Link>
              </h2>

              {blog.description && (
                <p className="text-neutral-500">{blog.description}</p>
              )}
            </>
          )}
        </div>
      )}
      {children}
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
