import LinkButton from "@/components/LinkButton";
import LoginStatus from "@/components/LoginStatus";
import Logo from "@/components/Logo";
import PostList from "@/components/PostList";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function Home() {
  const userCount = await prisma.user.count();
  const totalPosts = await prisma.post.count();

  const latestPublishedPostsFromDiscoverableBlogs = await prisma.post.findMany({
    orderBy: {
      publishedAt: "desc",
    },
    where: {
      publishedAt: {
        not: null,
      },
      blog: {
        discoverable: true,
      },
    },
    include: {
      blog: {
        select: {
          slug: true,
        },
      },
    },
    take: 100,
  });

  const discoverableBlogSlugs = latestPublishedPostsFromDiscoverableBlogs
    .map((post) => post.blog.slug)
    .filter((slug, index, self) => self.indexOf(slug) === index);

  let officialBlog;
  if (process.env.OFFICIAL_BLOG_SLUG) {
    officialBlog = await prisma.blog.findUnique({
      where: {
        slug: process.env.OFFICIAL_BLOG_SLUG,
      },
      include: {
        posts: {
          where: {
            publishedAt: {
              not: null,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  }

  return (
    <main className="space-y-4">
      <Logo />
      <p>타이포 블루는 글로 자신을 표현하는 공간입니다.</p>
      <p>
        지금까지 {userCount}명이 쓴 {totalPosts}개의 글과 함께하고 있습니다.
      </p>

      <nav className="space-x-2 flex">
        <HomeWithSession />
      </nav>

      {discoverableBlogSlugs.length > 0 && (
        <>
          <h3 className="text-normal font-bold">최근 업데이트된 블로그</h3>

          <div className="flex flex-row gap-2 flex-wrap">
            {discoverableBlogSlugs.map((slug) => (
              <LinkButton key={slug} href={`/@${slug}`}>
                @{slug}
              </LinkButton>
            ))}
          </div>
        </>
      )}

      {officialBlog && (
        <PostList
          name="공식 블로그 소식"
          posts={officialBlog.posts}
          showTitle={true}
          blog={officialBlog}
          titleClassName="text-normal font-bold"
          showTime={false}
        />
      )}
    </main>
  );
}

async function HomeWithSession() {
  const { user } = await validateRequest();

  let blog;

  if (user) {
    blog = await prisma.blog.findUnique({
      where: {
        userId: user.id,
      },
      include: {
        posts: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  return (
    <div>
      <div className="flex flex-row items-baseline space-x-2">
        {user && !blog && (
          <LinkButton href="/blogs/new">블로그 만들기</LinkButton>
        )}
        <LoginStatus />
      </div>
    </div>
  );
}
