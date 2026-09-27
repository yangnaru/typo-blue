import Logo from "@/components/Logo";
import { PlainButton } from "@/components/plain-button";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { blog, postTable } from "@/drizzle/schema";
import { getBlogPostPathWithSlugAndUuid } from "@/lib/paths";
import Link from "next/link";
import { count, eq, isNotNull, and, desc, isNull } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { ko } from "date-fns/locale";
import { convert } from "html-to-text";

const SEOUL = "Asia/Seoul";

export default async function Home() {
  const latestPublishedPostsFromDiscoverableBlogs = await db
    .select({
      id: postTable.id,
      slug: blog.slug,
      title: postTable.title,
      published: postTable.published,
      first_published: postTable.first_published,
      content: postTable.content,
      blog: {
        slug: blog.slug,
        name: blog.name,
      },
    })
    .from(postTable)
    .leftJoin(blog, eq(postTable.blogId, blog.id))
    .where(
      and(
        isNotNull(postTable.published),
        isNull(postTable.deleted),
        eq(blog.discoverable, true)
      )
    )
    .orderBy(desc(postTable.first_published))
    .limit(100);

  const recentPosts = latestPublishedPostsFromDiscoverableBlogs
    .map((post) => ({ ...post, preview: getPreview(post.content) }))
    .filter((post) => post.preview !== null);

  return (
    <main className="space-y-4">
      <Logo />

      <nav className="space-x-2 flex">
        <HomeWithSession />
      </nav>

      {recentPosts.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-normal font-bold">최근 새 글</h3>

          {groupBySeoulDay(recentPosts).map(({ day, posts }) => (
            <section key={day} className="space-y-3">
              <h4 className="flex items-baseline gap-2 text-xs font-bold text-neutral-500 after:flex-1 after:border-b after:border-neutral-200 dark:after:border-neutral-800">
                <DayLabel day={day} />
              </h4>

              <ul className="space-y-3">
                {posts.map((post) => (
                  <li key={post.id} className="break-keep">
                    <Link
                      href={getBlogPostPathWithSlugAndUuid(
                        post.blog!.slug,
                        post.id
                      )}
                      className="font-semibold"
                    >
                      {post.title || "무제"}
                    </Link>
                    <p className="text-neutral-500 text-xs truncate">
                      {post.blog?.name || `@${post.blog?.slug}`}
                    </p>
                    <p className="text-neutral-500 text-sm line-clamp-2">
                      {post.preview}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </section>
      )}
    </main>
  );
}

// Posts in order, split wherever the day in Seoul changes.
function groupBySeoulDay<T extends { first_published: Date | null }>(
  posts: T[]
): { day: string; posts: T[] }[] {
  const groups: { day: string; posts: T[] }[] = [];
  for (const post of posts) {
    const day = formatInTimeZone(post.first_published!, SEOUL, "yyyy-MM-dd");
    const last = groups.at(-1);
    if (last?.day === day) last.posts.push(post);
    else groups.push({ day, posts: [post] });
  }
  return groups;
}

// "오늘 9월 27일 일", "어제 9월 26일 토", or "9월 25일 목" for a yyyy-MM-dd day
// in Seoul.
function DayLabel({ day }: { day: string }) {
  const now = new Date();
  const today = formatInTimeZone(now, SEOUL, "yyyy-MM-dd");
  // Seoul has no daylight saving, so a day ago is always yesterday there.
  const yesterday = formatInTimeZone(
    new Date(now.getTime() - 24 * 60 * 60 * 1000),
    SEOUL,
    "yyyy-MM-dd"
  );
  const relative =
    day === today ? "오늘" : day === yesterday ? "어제" : null;
  // Noon keeps the date the same in any zone the formatter might use.
  const date = new Date(`${day}T12:00:00+09:00`);
  const label = formatInTimeZone(date, SEOUL, "M월 d일 EEE", { locale: ko });

  return (
    <>
      {relative && <span className="text-foreground">{relative}</span>}
      <span className="tabular-nums">{label}</span>
    </>
  );
}

// The first sentence of a post as plain text, or null when it has no text.
function getPreview(content: string | null): string | null {
  if (!content) return null;
  const plainText = convert(content, {
    wordwrap: false,
    preserveNewlines: false,
    selectors: [
      { selector: "img", format: "skip" },
      { selector: "a", options: { ignoreHref: true } },
    ],
  }).trim();
  if (plainText.length === 0) return null;

  const sentenceMatch = plainText.match(/.*?[.!?](?=\s|$)/);
  if (sentenceMatch) {
    const sentence = sentenceMatch[0];
    return sentence.length < plainText.length ? `${sentence} ...` : sentence;
  }
  // If text is short, use the whole thing
  if (plainText.length <= 100) return plainText;
  // For longer text, truncate at a word boundary if possible
  let truncated = plainText.slice(0, 80);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > 40) truncated = truncated.slice(0, lastSpace);
  return `${truncated} ...`;
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
        {user && userBlog?.[0]?.count === 0 && (
          <PlainButton asChild>
            <Link href="/blogs/new">블로그 만들기</Link>
          </PlainButton>
        )}
      </div>
    </div>
  );
}
