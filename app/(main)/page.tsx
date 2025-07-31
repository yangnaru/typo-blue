import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { blog, postTable } from "@/drizzle/schema";
import { getBlogPostPathWithSlugAndUuid } from "@/lib/paths";
import Link from "next/link";
import { count, eq, isNotNull, and, desc, isNull } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";

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

      {latestPublishedPostsFromDiscoverableBlogs.length > 0 && (
        <>
          <h3 className="text-normal font-bold">최근 새 글</h3>

          <div className="flex flex-col gap-2">
            {latestPublishedPostsFromDiscoverableBlogs
              .filter((post) => {
                // Filter out posts with empty or whitespace-only content
                if (!post.content) return false;
                // Remove all HTML tags and check if there's any non-whitespace text left
                const plainText = post.content.replace(/<[^>]+>/g, "").trim();
                return plainText.length > 0;
              })
              .map((post) => {
                let firstSentence = "";
                if (post.content) {
                  // Extract the first <p>...</p> block (case-insensitive, dot matches newline)
                  const match = post.content.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
                  let firstParagraphText = "";
                  if (match && match[1]) {
                    // Remove any HTML tags from the paragraph
                    firstParagraphText = match[1]
                      .replace(/<[^>]+>/g, "")
                      .trim();
                  } else {
                    // Fallback: remove all tags and use the plain text
                    firstParagraphText = post.content
                      .replace(/<[^>]+>/g, "")
                      .trim();
                  }
                  // Extract the first sentence (ends with . ! or ?)
                  const sentenceMatch =
                    firstParagraphText.match(/.*?[.!?](?=\s|$)/);
                  if (sentenceMatch) {
                    firstSentence = sentenceMatch[0];
                  } else {
                    // If no punctuation, take up to 80 chars or the whole paragraph
                    firstSentence = firstParagraphText.slice(0, 80);
                  }
                }
                return (
                  <Link
                    href={getBlogPostPathWithSlugAndUuid(
                      post.blog!.slug,
                      post.id
                    )}
                    key={post.id}
                  >
                    <Card key={post.id} className="p-2">
                      <CardContent className="p-2">
                        <div className="gap-2 flex flex-col">
                          <div className="font-semibold text-base mb-1 flex flex-row items-center gap-2">
                            {post.title}
                          </div>
                          <div>
                            {firstSentence}
                            {firstSentence && " ..."}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
          </div>
        </>
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
