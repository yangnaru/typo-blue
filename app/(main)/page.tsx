import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { blog, postTable } from "@/drizzle/schema";
import { getBlogPostPathWithSlugAndUuid } from "@/lib/paths";
import Link from "next/link";
import { count, eq, isNotNull, and, desc, isNull } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, ArrowRight } from "lucide-react";
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

  return (
    <main>
      <Logo />
      <div className="text-center space-y-6 py-8">
        <div className="max-w-xl mx-auto space-y-4">
          <p className="text-lg text-muted-foreground">
            타이포 블루는 새로운 블로깅 플랫폼입니다
          </p>
          <div className="text-sm text-muted-foreground space-y-2">
            <ul className="list-disc list-inside space-y-1">
              <li>텍스트와 이미지 등을 포함한 게시물을 쓸 수 있습니다</li>
              <li>독자들이 이메일로 새 글을 구독할 수 있습니다</li>
              <li>연합우주로 글을 발행할 수 있습니다</li>
            </ul>
          </div>

          <p className="text-muted-foreground pt-2">
            지금 이메일로 가입하고 블로그를 만들어 보세요!
          </p>
        </div>

        <nav className="space-x-2 flex">
          <HomeWithSession />
        </nav>
      </div>

      {latestPublishedPostsFromDiscoverableBlogs.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Separator className="flex-1" />
            <h2 className="text-xl font-semibold text-foreground">
              최근 새 글
            </h2>
            <Separator className="flex-1" />
          </div>

          <div className="space-y-4">
            {latestPublishedPostsFromDiscoverableBlogs
              .filter((post) => {
                // Filter out posts with empty or whitespace-only content
                if (!post.content) return false;
                const plainText = convert(post.content, {
                  wordwrap: false,
                  preserveNewlines: false,
                }).trim();
                return plainText.length > 0;
              })
              .map((post) => {
                let firstSentence = "";
                let isTruncated = false;
                if (post.content) {
                  // Convert HTML to plain text
                  const plainText = convert(post.content, {
                    wordwrap: false,
                    preserveNewlines: false,
                  }).trim();

                  // Extract the first sentence or reasonable preview
                  const sentenceMatch = plainText.match(/.*?[.!?](?=\s|$)/);
                  if (sentenceMatch) {
                    firstSentence = sentenceMatch[0];
                    isTruncated = firstSentence.length < plainText.length;
                  } else if (plainText.length <= 100) {
                    // If text is short, use the whole thing
                    firstSentence = plainText;
                    isTruncated = false;
                  } else {
                    // For longer text, truncate at word/character boundary
                    firstSentence = plainText.slice(0, 80);
                    // Try to break at a space if possible
                    const lastSpace = firstSentence.lastIndexOf(" ");
                    if (lastSpace > 40) {
                      firstSentence = firstSentence.slice(0, lastSpace);
                    }
                    isTruncated = true;
                  }
                }
                return (
                  <Card
                    key={post.id}
                    className="hover:shadow-md transition-shadow duration-200 group"
                  >
                    <CardContent className="p-4">
                      <Link
                        href={getBlogPostPathWithSlugAndUuid(
                          post.blog!.slug,
                          post.id
                        )}
                        className="block"
                      >
                        <div className="space-y-3">
                          {/* Post Title */}
                          <div className="flex items-start justify-between gap-4">
                            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2 flex-1">
                              {post.title || "무제"}
                            </h3>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                          </div>

                          {/* Post Preview */}
                          {firstSentence && (
                            <p className="text-muted-foreground text-sm line-clamp-2">
                              {firstSentence}
                              {isTruncated ? "..." : ""}
                            </p>
                          )}

                          {/* Blog Info and Date */}
                          <div className="flex items-center justify-between gap-4 pt-2 border-t">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {post.blog?.name || `@${post.blog?.slug}`}
                              </Badge>
                              {post.blog?.name && (
                                <span className="text-xs text-muted-foreground">
                                  @{post.blog?.slug}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {formatInTimeZone(
                                  post.first_published!,
                                  "Asia/Seoul",
                                  "MM-dd"
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
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
