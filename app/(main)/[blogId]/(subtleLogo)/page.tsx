import Button from "@/components/Button";
import LinkButton from "@/components/LinkButton";
import PostList from "@/components/PostList";
import { followBlog, unfollowBlog } from "@/lib/actions";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { incrementVisitorCount, logView } from "@/lib/server-util";
import { Metadata } from "next";
import { headers } from "next/headers";

export async function generateMetadata({
  params,
}: {
  params: { blogId: string };
}): Promise<Metadata> {
  const blogId = decodeURIComponent(params.blogId);
  if (!blogId.startsWith("@")) {
    return {
      title: "존재하지 않는 블로그입니다.",
    };
  }

  const slug = blogId.replace("@", "");
  const blog = await prisma.blog.findUnique({
    where: {
      slug: slug,
    },
    include: {
      user: true,
    },
  });

  if (!blog) {
    return {
      title: "존재하지 않는 블로그입니다.",
    };
  }

  return {
    title: blog.name ?? `@${blog.slug}`,
    description: blog.description,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_URL}/${blogId}`,
      types: {
        "application/atom+xml": [
          {
            title: blog.name ?? blogId,
            url: `${process.env.NEXT_PUBLIC_URL}/${blogId}/feed.xml`,
          },
        ],
      },
    },
  };
}

export default async function BlogHome({
  params,
}: {
  params: { blogId: string };
}) {
  const { user } = await validateRequest();

  let currentUser;
  if (user) {
    currentUser = await prisma.user.findUnique({
      where: {
        id: user?.id,
      },
      include: {
        blog: true,
      },
    });
  }

  const blogId = decodeURIComponent(params.blogId);
  if (!blogId.startsWith("@")) return <p>👀</p>;

  const slug = blogId.replace("@", "");
  const blog = await prisma.blog.findUnique({
    where: {
      slug: slug,
    },
    include: {
      posts: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      guestbook: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          author: true,
        },
      },
      user: true,
    },
  });

  if (!blog) {
    return <p>블로그가 존재하지 않습니다.</p>;
  }

  const isCurrentlyFollowing =
    currentUser &&
    currentUser.blog &&
    (await prisma.follow.findFirst({
      where: {
        followerId: currentUser.blog.id,
        followingId: blog.id,
      },
    })) !== null;

  await incrementVisitorCount(blog.id);

  const ip = (headers().get("x-forwarded-for") ?? "127.0.0.1").split(",")[0];
  const userAgent = headers().get("user-agent") ?? "";
  await logView({
    ip,
    userAgent,
    blogId: blog.id,
  });

  const isCurrentUserBlogOwner = blog.user.email === user?.email;
  const draftPosts = blog.posts.filter((post) => post.publishedAt === null);
  const publishedPosts = blog.posts.filter((post) => post.publishedAt !== null);

  return (
    <div className="space-y-8">
      {isCurrentUserBlogOwner && (
        <PostList
          name="임시 저장된 글 목록"
          blog={blog}
          posts={draftPosts}
          showTitle={isCurrentUserBlogOwner}
        />
      )}

      <PostList
        name="발행된 글 목록"
        blog={blog}
        posts={publishedPosts}
        showTitle={isCurrentUserBlogOwner}
      />

      <div className="flex flex-row space-x-2">
        <LinkButton href={`/@${blog.slug}/guestbook`}>방명록</LinkButton>

        {blog.id !== currentUser?.blog?.id &&
          currentUser?.blog &&
          (isCurrentlyFollowing ? (
            <form action={unfollowBlog}>
              <input type="hidden" name="blogId" value={blog.slug} />
              <button
                className="border rounded-sm p-1 border-red-500 hover:text-black hover:bg-red-300"
                type="submit"
              >
                파도타기 삭제
              </button>
            </form>
          ) : (
            <form action={followBlog}>
              <input type="hidden" name="blogId" value={blog.slug} />
              <button
                className="border border-blue-500 p-1 rounded-sm hover:bg-blue-300 hover:text-black"
                type="submit"
              >
                파도타기 추가
              </button>
            </form>
          ))}
      </div>

      {isCurrentUserBlogOwner && (
        <div className="space-x-2">
          <LinkButton href={`/@${blog.slug}/new-post`}>새 글 쓰기</LinkButton>
          <LinkButton href={`/@${blog.slug}/edit`}>블로그 관리</LinkButton>
        </div>
      )}
    </div>
  );
}
