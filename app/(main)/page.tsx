import LinkButton from "@/components/LinkButton";
import LoginStatus from "@/components/LoginStatus";
import Logo from "@/components/Logo";
import PostList from "@/components/PostList";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encodePostId } from "@/lib/utils";
import formatInTimeZone from "date-fns-tz/formatInTimeZone";
import Link from "next/link";

export default async function Home() {
  const { user } = await validateRequest();

  const userCount = await prisma.user.count();
  const totalNotDeletedPosts = await prisma.post.count({
    where: {
      deletedAt: null,
    },
  });

  const latestPublishedPostsFromDiscoverableBlogs = await prisma.post.findMany({
    orderBy: {
      publishedAt: "desc",
    },
    where: {
      deletedAt: null,
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

  let followingBlogPosts;
  if (user) {
    followingBlogPosts = await prisma.post.findMany({
      orderBy: {
        publishedAt: "desc",
      },
      where: {
        deletedAt: null,
        publishedAt: {
          not: null,
        },
        blog: {
          followers: {
            some: {
              followerId: user.id,
            },
          },
        },
      },
      take: 100,
      include: {
        blog: {
          select: {
            slug: true,
          },
        },
      },
    });
  }
  const dateFormat = "yyyy-MM-dd";

  let officialBlog;
  if (process.env.OFFICIAL_BLOG_SLUG) {
    officialBlog = await prisma.blog.findUnique({
      where: {
        slug: process.env.OFFICIAL_BLOG_SLUG,
      },
      include: {
        posts: {
          where: {
            deletedAt: null,
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
        지금까지 {userCount}명이 쓴 {totalNotDeletedPosts}개의 글과 함께하고
        있습니다.
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

      {followingBlogPosts && followingBlogPosts.length > 0 && (
        <>
          <h3 className="text-normal font-bold">파도타기 블로그 소식</h3>

          <ul className="space-y-2">
            {followingBlogPosts.map((post) => {
              const base62 = encodePostId(post.uuid);

              return (
                <li key={encodePostId(post.uuid)}>
                  <Link href={`/@${post.blog.slug}/${base62}`}>
                    {post.publishedAt ? (
                      <span className="font-bold tabular-nums">
                        {formatInTimeZone(
                          post.publishedAt,
                          "Asia/Seoul",
                          dateFormat
                        )}
                      </span>
                    ) : (
                      <span className="font-bold tabular-nums">
                        {formatInTimeZone(
                          post.updatedAt,
                          "Asia/Seoul",
                          dateFormat
                        )}
                      </span>
                    )}{" "}
                    {post.title?.length === 0 ? "무제" : post.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
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
            uuid: true,
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
