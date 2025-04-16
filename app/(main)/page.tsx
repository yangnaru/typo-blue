import Logo from "@/components/Logo";
import PostList from "@/components/PostList";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Blog, blog, Post, post, user } from "@/lib/schema";
import { getBlogHomePath } from "@/lib/paths";
import Link from "next/link";
import { count, eq, isNotNull, and, desc, isNull, inArray } from "drizzle-orm";

export default async function Home() {
  const userCount = (await db.select({ count: count() }).from(user))[0].count;

  const totalNotDeletedPosts = (
    await db.select({ count: count() }).from(post).where(isNull(post.deletedAt))
  )[0].count;

  const latestPublishedPostsFromDiscoverableBlogs = await db
    .select({ slug: blog.slug })
    .from(post)
    .leftJoin(blog, eq(post.blogId, blog.id))
    .where(
      and(
        isNotNull(post.publishedAt),
        isNull(post.deletedAt),
        eq(blog.discoverable, true)
      )
    )
    .orderBy(desc(post.publishedAt))
    .limit(100);

  const discoverableBlogSlugs = Array.from(
    new Set([
      ...latestPublishedPostsFromDiscoverableBlogs.map(
        (blog) => blog.slug ?? ""
      ),
    ])
  );

  let officialBlogPosts: (Post & { blog: Blog })[] = [];
  if (process.env.OFFICIAL_BLOG_SLUG) {
    officialBlogPosts = await db.query.post.findMany({
      with: { blog: true },
      where: inArray(
        post.blogId,
        db
          .select({ blogId: blog.id })
          .from(blog)
          .where(eq(blog.slug, process.env.OFFICIAL_BLOG_SLUG))
      ),
      orderBy: desc(post.createdAt),
    });
    // blog_id IN (SELECT id AS blogId FROM blog WHERE slug = '..')
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

      {discoverableBlogSlugs && (
        <>
          <h3 className="text-normal font-bold">최근 업데이트된 블로그</h3>

          <div className="flex flex-row gap-2 flex-wrap">
            {discoverableBlogSlugs.map((slug) => (
              <Button key={slug} variant="outline" asChild>
                <Link href={getBlogHomePath(slug)}>@{slug}</Link>
              </Button>
            ))}
          </div>
        </>
      )}

      {officialBlogPosts.length > 0 && (
        <PostList
          name="공식 블로그 소식"
          posts={officialBlogPosts}
          showTitle={true}
          blog={officialBlogPosts[0].blog}
          titleClassName="text-normal font-bold"
          showTime={false}
        />
      )}
    </main>
  );
}

async function HomeWithSession() {
  const { user } = await getCurrentSession();

  let userBlog;
  if (user) {
    userBlog = await db
      .select({ count: count() })
      .from(blog)
      .where(eq(blog.userId, user.id));
  }

  return (
    <div>
      <div className="flex flex-row items-baseline space-x-2">
        {user && !userBlog && (
          <Button asChild>
            <Link href="/blogs/new">블로그 만들기</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
