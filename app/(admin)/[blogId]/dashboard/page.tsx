import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import formatInTimeZone from "date-fns-tz/formatInTimeZone";
import Link from "next/link";
import {
  getBlogNewPostPath,
  getBlogPostEditPath,
  getBlogPostPath,
  getRootPath,
} from "@/lib/paths";
import { redirect } from "next/navigation";
import {
  SquareArrowUpRight,
  Edit3,
  Clock,
  Calendar,
  Mail,
  MailCheck,
  FileText,
  Plus,
} from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { desc, eq, isNull } from "drizzle-orm";
import { blog, postTable } from "@/drizzle/schema";

type PageProps = Promise<{
  blogId: string;
}>;

export default async function Dashboard(props: { params: PageProps }) {
  const { blogId } = await props.params;

  const { user: sessionUser } = await getCurrentSession();

  const decodedBlogId = decodeURIComponent(blogId);
  const slug = decodedBlogId.replace("@", "");
  const currentBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, slug),
    with: {
      posts: {
        orderBy: (post) => [desc(post.published)],
        where: isNull(postTable.deleted),
      },
    },
  });

  // Email sent information is now part of the post object

  if (!currentBlog) {
    redirect(getRootPath());
  }

  if (!sessionUser || sessionUser.id !== currentBlog?.userId) {
    redirect(getRootPath());
  }

  // Helper function to calculate reading time
  const calculateReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.trim().split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  // Helper function to extract excerpt
  const getExcerpt = (content: string, maxLength = 150) => {
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    return cleanContent.length > maxLength 
      ? cleanContent.substring(0, maxLength) + '...'
      : cleanContent;
  };

  return (
    <div className="space-y-6">
      {/* Header with stats and actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">글 목록</h1>
          <p className="text-muted-foreground">
            총 {currentBlog.posts.length}개의 글 • 
            발행된 글 {currentBlog.posts.filter(p => p.published).length}개 • 
            초안 {currentBlog.posts.filter(p => !p.published).length}개
          </p>
        </div>
        <Link href={getBlogNewPostPath(slug)}>
          <Button size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            새 글 작성
          </Button>
        </Link>
      </div>

      {/* Posts grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {currentBlog.posts.map((post) => {
          const emailSentAt = post.emailSent;
          const readingTime = calculateReadingTime(post.content || '');
          const excerpt = getExcerpt(post.content || '', 120);
          const publishDate = post.first_published ?? post.published ?? post.updated;
          
          return (
            <Card key={post.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg leading-tight truncate">
                      {post.title === "" ? "무제" : post.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      {post.published ? (
                        <Badge variant="default" className="text-xs">
                          발행
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          초안
                        </Badge>
                      )}
                      {emailSentAt && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <MailCheck className="h-3 w-3" />
                          발송됨
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Link href={getBlogPostEditPath(slug, post.id)}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit3 className="h-4 w-4" />
                        <span className="sr-only">수정</span>
                      </Button>
                    </Link>
                    <Link href={getBlogPostPath(slug, post.id)} target="_blank">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <SquareArrowUpRight className="h-4 w-4" />
                        <span className="sr-only">보기</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 pb-3">
                {excerpt && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {excerpt}
                  </p>
                )}
                
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatInTimeZone(publishDate, "Asia/Seoul", "MM/dd HH:mm")}
                    </div>
                    {readingTime > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {readingTime}분
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {(post.content || '').trim().split(/\s+/).length}단어
                    </div>
                  </div>
                  
                  {emailSentAt && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded-lg">
                      <Mail className="h-3 w-3" />
                      <span>이메일 발송: {formatInTimeZone(emailSentAt, "Asia/Seoul", "MM/dd HH:mm")}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {currentBlog.posts.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">아직 작성한 글이 없습니다</CardTitle>
            <CardDescription className="mb-4">
              첫 번째 글을 작성해보세요.
            </CardDescription>
            <Link href={getBlogNewPostPath(slug)}>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                새 글 작성
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
