import PostList from "@/components/PostList";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { incrementVisitorCount } from "@/lib/server-util";

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

  await incrementVisitorCount(blog.id);

  const publishedPosts = blog.posts.filter((post) => post.publishedAt !== null);

  return (
    <PostList
      name="발행된 글 목록"
      blog={blog}
      posts={publishedPosts}
      showTitle={false}
      embed={true}
    />
  );
}
