import PostList from "@/components/PostList";
import MailingListSubscription from "@/components/MailingListSubscription";
import { PageViewTracker } from "@/components/PageViewTracker";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBlogPostsPath } from "@/lib/paths";
import { blog, postTable, user } from "@/drizzle/schema";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { Metadata } from "next";
import Link from "next/link";
import { incrementVisitorCount } from "@/lib/actions/blog";
import { notFound } from "next/navigation";
import { getActorForBlog } from "@/lib/activitypub";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type MetadataParams = Promise<{
  blogId: string;
}>;

export async function generateMetadata(props: {
  params: MetadataParams;
}): Promise<Metadata> {
  const blogId = decodeURIComponent((await props.params).blogId);
  if (!blogId.startsWith("@")) {
    return {
      title: "존재하지 않는 블로그입니다.",
    };
  }

  const slug = blogId.replace("@", "");
  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, slug),
    with: {
      user: true,
    },
  });

  if (!targetBlog) {
    return {
      title: "존재하지 않는 블로그입니다.",
    };
  }

  return {
    title: targetBlog.name ?? `@${targetBlog.slug}`,
    description: targetBlog.description,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_URL}/${blogId}`,
      types: {
        "application/atom+xml": [
          {
            title: targetBlog.name ?? blogId,
            url: `${process.env.NEXT_PUBLIC_URL}/${blogId}/feed.xml`,
          },
        ],
      },
    },
  };
}

type Params = Promise<{
  blogId: string;
}>;

export default async function BlogHome(props: { params: Params }) {
  const { user: sessionUser } = await getCurrentSession();

  let currentUser;
  if (sessionUser) {
    currentUser = await db.query.user.findFirst({
      where: eq(user.id, sessionUser.id),
      with: {
        blogs: true,
      },
    });
  }

  const blogId = decodeURIComponent((await props.params).blogId);
  if (!blogId.startsWith("@")) {
    notFound();
  }

  const slug = blogId.replace("@", "");
  const targetBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, slug),
    with: {
      posts: {
        where: and(isNull(postTable.deleted), isNotNull(postTable.published)),
        orderBy: desc(postTable.created),
      },
      user: true,
    },
  });

  if (!targetBlog) {
    return <p>블로그가 존재하지 않습니다.</p>;
  }

  const isCurrentUserBlogOwner =
    sessionUser && targetBlog.user.id === sessionUser.id;
  const publishedPosts = targetBlog.posts;

  // Check if ActivityPub federation is enabled for this blog
  const blogActor = await getActorForBlog(targetBlog.id);
  const federationEnabled = !!blogActor;
  const fediverseHandle = federationEnabled
    ? `@${targetBlog.slug}@${process.env.NEXT_PUBLIC_DOMAIN}`
    : null;

  await incrementVisitorCount(targetBlog.id);

  return (
    <div className="max-w-4xl mx-auto">
      <PageViewTracker blogId={targetBlog.id} />

      {/* Blog Header */}
      <div className="space-y-4 py-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {targetBlog.name || `@${targetBlog.slug}`}
            </h1>
            {targetBlog.description && (
              <p className="text-muted-foreground text-lg">
                {targetBlog.description}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Badge variant="secondary">@{targetBlog.slug}</Badge>
              <Badge variant="outline">{publishedPosts.length}개의 글</Badge>
            </div>
          </div>
          {isCurrentUserBlogOwner && (
            <Button asChild>
              <Link href={getBlogPostsPath(targetBlog.slug)}>블로그 관리</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="py-4">
        <Separator />
      </div>

      {/* Posts Section */}
      <div className="py-6">
        <PostList
          name="발행된 글 목록"
          blog={targetBlog}
          posts={publishedPosts}
          showTitle={false}
        />
      </div>

      {/* Subscription and Federation Cards */}
      {!isCurrentUserBlogOwner && (
        <>
          <div className="py-4">
            <Separator />
          </div>
        </>
      )}
      {!isCurrentUserBlogOwner && (
        <div className="py-6">
          <div className="flex flex-col gap-6">
            <MailingListSubscription
              blogId={targetBlog.id}
              blogName={targetBlog.name || `@${targetBlog.slug}`}
            />

            {federationEnabled && fediverseHandle && (
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    🌐 연합우주에서 팔로우
                  </CardTitle>
                  <CardDescription>
                    마스토돈, 미스키 등에서 이 블로그를 팔로우하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                    <code className="text-sm font-mono text-blue-600 dark:text-blue-400 select-all">
                      {fediverseHandle}
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    위 핸들을 복사하여 연합우주 클라이언트에서 검색하고
                    팔로우하세요
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
