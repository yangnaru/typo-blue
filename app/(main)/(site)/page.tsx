import Logo from "@/components/Logo";
import { PlainButton } from "@/components/plain-button";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { blog, postTable } from "@/drizzle/schema";
import { getBlogPostPathWithSlugAndUuid } from "@/lib/paths";
import Link from "next/link";
import { count, eq, isNotNull, and, desc, isNull } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { convert } from "html-to-text";

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
        <>
          <h3 className="text-normal font-bold">최근 새 글</h3>

          <ul className="space-y-3">
            {recentPosts.map((post) => (
              <li key={post.id} className="break-keep">
                <Link
                  href={getBlogPostPathWithSlugAndUuid(
                    post.blog!.slug,
                    post.id
                  )}
                >
                  <span className="font-bold tabular-nums">
                    {formatInTimeZone(
                      post.first_published!,
                      "Asia/Seoul",
                      "yyyy-MM-dd"
                    )}
                  </span>{" "}
                  {post.title || "무제"}{" "}
                  <span className="text-neutral-500">
                    {post.blog?.name || `@${post.blog?.slug}`}
                  </span>
                </Link>
                <p className="text-neutral-500 text-sm line-clamp-2">
                  {post.preview}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
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
