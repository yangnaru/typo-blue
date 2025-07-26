import Logo from "@/components/Logo";
import PostList from "@/components/PostList";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { blog, post, user } from "@/drizzle/schema";
import { getBlogHomePath } from "@/lib/paths";
import Link from "next/link";
import { count, eq, isNotNull, and, desc, isNull, inArray } from "drizzle-orm";

export default async function Home() {
  const userCount = (await db.select({ count: count() }).from(user))[0].count;

  const totalNotDeletedPosts = (
    await db.select({ count: count() }).from(post).where(isNull(post.deleted))
  )[0].count;

  const latestPublishedPostsFromDiscoverableBlogs = await db
    .select({ slug: blog.slug })
    .from(post)
    .leftJoin(blog, eq(post.blogId, blog.id))
    .where(
      and(
        isNotNull(post.published),
        isNull(post.deleted),
        eq(blog.discoverable, true)
      )
    )
    .orderBy(desc(post.published))
    .limit(100);

  const discoverableBlogSlugs = Array.from(
    new Set([
      ...latestPublishedPostsFromDiscoverableBlogs.map(
        (blog) => blog.slug ?? ""
      ),
    ])
  );

  let officialBlogPosts: any = [];
  if (process.env.OFFICIAL_BLOG_SLUG) {
    officialBlogPosts = await db.query.post.findMany({
      with: { blog: true },
      where: and(
        inArray(
          post.blogId,
          db
            .select({ blogId: blog.id })
            .from(blog)
            .where(eq(blog.slug, process.env.OFFICIAL_BLOG_SLUG))
        ),
        isNotNull(post.published),
        isNull(post.deleted)
      ),
      orderBy: desc(post.created),
    });
    // blog_id IN (SELECT id AS blogId FROM blog WHERE slug = '..')
  }

  return (
    <main className="space-y-4">
      <Logo />

      <p>타이포 블루는 텍스트 전용 블로깅 플랫폼입니다.</p>

      <ul className="list-disc list-inside">
        <li>텍스트로만 게시물을 쓸 수 있습니다.</li>
        <li>사진 등의 첨부 파일은 올릴 수 없습니다.</li>
        <li>독자들이 이메일로 새 글을 구독할 수 있습니다.</li>
      </ul>

      <p>지금 이메일로 가입하고 블로그를 만들어 보세요.</p>

      <nav className="space-x-2 flex">
        <HomeWithSession />
      </nav>

      {discoverableBlogSlugs.length > 0 && (
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
