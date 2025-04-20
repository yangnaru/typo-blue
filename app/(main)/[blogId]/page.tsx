import PostList from "@/components/PostList";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBlogDashboardPath } from "@/lib/paths";
import { blog, post, user } from "@/drizzle/schema";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { Metadata } from "next";
import Link from "next/link";

type MetadataParams = Promise<{
  blogId: string;
}>;

export async function generateMetadata(props: {
  params: MetadataParams;
}): Promise<Metadata> {
  const blogId = decodeURIComponent((await props.params).blogId);
  if (!blogId.startsWith("@")) {
    return {
      title: "존재하지 않는 블로그입니다.",
    };
  }

  const slug = blogId.replace("@", "");
  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, slug),
    with: {
      user: true,
    },
  });

  if (!targetBlog) {
    return {
      title: "존재하지 않는 블로그입니다.",
    };
  }

  return {
    title: targetBlog.name ?? `@${targetBlog.slug}`,
    description: targetBlog.description,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_URL}/${blogId}`,
      types: {
        "application/atom+xml": [
          {
            title: targetBlog.name ?? blogId,
            url: `${process.env.NEXT_PUBLIC_URL}/${blogId}/feed.xml`,
          },
        ],
      },
    },
  };
}

type Params = Promise<{
  blogId: string;
}>;

export default async function BlogHome(props: { params: Params }) {
  const { user: sessionUser } = await getCurrentSession();

  let currentUser;
  if (sessionUser) {
    currentUser = await db.query.user.findFirst({
      where: eq(user.id, sessionUser.id),
      with: {
        blogs: true,
      },
    });
  }

  const blogId = decodeURIComponent((await props.params).blogId);
  if (!blogId.startsWith("@")) return <p>👀</p>;

  const slug = blogId.replace("@", "");
  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, slug),
    with: {
      posts: {
        where: and(isNull(post.deletedAt), isNotNull(post.publishedAt)),
        orderBy: desc(post.createdAt),
      },
      user: true,
    },
  });

  if (!targetBlog) {
    return <p>블로그가 존재하지 않습니다.</p>;
  }

  const isCurrentUserBlogOwner =
    sessionUser && targetBlog.user.email === sessionUser.email;
  const publishedPosts = targetBlog.posts;

  return (
    <div className="space-y-8">
      <PostList
        name="발행된 글 목록"
        blog={targetBlog}
        posts={publishedPosts}
        showTitle={false}
      />

      <div className="flex flex-row space-x-2">
        {isCurrentUserBlogOwner && (
          <div className="space-x-2">
            <Button>
              <Link href={getBlogDashboardPath(targetBlog.slug)}>
                블로그 관리
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
