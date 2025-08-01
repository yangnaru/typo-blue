import { getCurrentSession } from "@/lib/auth";
import { formatInTimeZone } from "date-fns-tz";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageViewTracker } from "@/components/PageViewTracker";
import { getBlogPostEditPath } from "@/lib/paths";
import { db } from "@/lib/db";
import { blog, postTable, user } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { incrementVisitorCount } from "@/lib/actions/blog";
import sanitize from "sanitize-html";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Edit, ArrowLeft } from "lucide-react";

type MetadataParams = Promise<{
  postId: string;
}>;

export async function generateMetadata(props: {
  params: MetadataParams;
}): Promise<Metadata> {
  const { user } = await getCurrentSession();

  const uuid = (await props.params).postId;

  const targetPost = await db.query.postTable.findFirst({
    where: eq(postTable.id, uuid),
  });

  if (!targetPost) {
    return {
      title: "존재하지 않는 글입니다.",
    };
  }

  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.id, targetPost?.blogId),
  });

  if (!targetBlog) {
    return {
      title: "존재하지 않는 글입니다.",
    };
  }

  if (!targetPost.published && targetBlog.userId !== user?.id) {
    return {
      title: "존재하지 않는 글입니다.",
    };
  }

  const blogName = targetBlog.name ?? `@${targetBlog.slug}`;
  const blogDescription = targetBlog.description ?? "";
  const postTitle = targetPost.title === "" ? "무제" : targetPost.title;

  return {
    title: postTitle,
    description: blogName + (blogDescription ? ` — ${blogDescription}` : ""),
    alternates: {
      types: {
        "application/activity+json": [
          {
            url: `https://${process.env.NEXT_PUBLIC_DOMAIN}/ap/notes/${targetPost.id}`,
          },
        ],
      },
    },
  };
}

type Params = Promise<{
  blogId: string;
  postId: string;
}>;

export default async function BlogPost(props: { params: Params }) {
  const { user: sessionUser } = await getCurrentSession();

  const blogId = decodeURIComponent((await props.params).blogId);
  if (!blogId.startsWith("@")) return <p>👀</p>;

  const slug = blogId.replace("@", "");
  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, slug),
    with: {
      user: true,
    },
  });

  if (!targetBlog) {
    return <p>블로그가 존재하지 않습니다.</p>;
  }

  const targetBlogUser = await db.query.user.findFirst({
    where: eq(user.id, targetBlog.userId),
  });

  if (!targetBlogUser) {
    return <p>블로그 작성자를 찾을 수 없습니다.</p>;
  }

  const isCurrentUserBlogOwner = targetBlogUser.email === sessionUser?.email;

  const uuid = (await props.params).postId;
  const targetPost = await db.query.postTable.findFirst({
    where: eq(postTable.id, uuid),
  });

  if (!targetPost || (!targetPost.published && !isCurrentUserBlogOwner)) {
    return <p>글이 존재하지 않습니다.</p>;
  }

  await incrementVisitorCount(targetBlog.id);

  return (
    <article className="max-w-4xl mx-auto">
      <PageViewTracker blogId={targetBlog.id} postId={targetPost.id} />

      {/* Post Header */}
      <div className="py-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-3 flex-1">
              <h1 className="text-4xl font-bold tracking-tight break-keep leading-tight">
                {targetPost.title === "" ? "무제" : targetPost.title}
              </h1>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    {formatInTimeZone(
                      targetPost.first_published ??
                        targetPost.published ??
                        targetPost.updated,
                      "Asia/Seoul",
                      "yyyy-MM-dd HH:mm"
                    )}
                  </span>
                </div>
                {!targetPost.published && (
                  <Badge variant="secondary" className="text-xs">
                    초안
                  </Badge>
                )}
              </div>
            </div>
            {isCurrentUserBlogOwner && (
              <Button asChild>
                <Link
                  href={getBlogPostEditPath(slug, (await props.params).postId)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  수정
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="py-4">
        <Separator />
      </div>

      {/* Post Content */}
      <div className="py-6">
        <Card>
          <CardContent className="p-4">
            <div
              className="prose prose-lg dark:prose-invert max-w-none break-keep prose-headings:scroll-mt-24 prose-pre:bg-muted prose-pre:border"
              dangerouslySetInnerHTML={{
                __html: sanitize(targetPost.content ?? ""),
              }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="py-4">
        <Separator />
      </div>

      {/* Post Footer */}
      <div className="py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link
              href={`/@${targetBlog.slug}`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {targetBlog.name || `@${targetBlog.slug}`}에서 발행
            </Link>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              방문자 수: {targetBlog.visitor_count?.toLocaleString() || 0}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
