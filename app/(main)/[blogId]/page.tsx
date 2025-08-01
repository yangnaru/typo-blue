import PostList from "@/components/PostList";
import MailingListSubscription from "@/components/MailingListSubscription";
import { PageViewTracker } from "@/components/PageViewTracker";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBlogDashboardPath } from "@/lib/paths";
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
    <div className="space-y-8">
      <PageViewTracker blogId={targetBlog.id} />

      <PostList
        name="발행된 글 목록"
        blog={targetBlog}
        posts={publishedPosts}
        showTitle={false}
      />

      {!isCurrentUserBlogOwner && (
        <>
          <MailingListSubscription
            blogId={targetBlog.id}
            blogName={targetBlog.name || `@${targetBlog.slug}`}
          />

          {federationEnabled && fediverseHandle && (
            <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  연합우주에서 팔로우하기
                </CardTitle>
                <CardDescription>
                  마스토돈, 미스키 등 연합우주(Fediverse) 플랫폼에서 이 블로그를
                  팔로우할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="bg-white dark:bg-gray-900 rounded-md select-all">
                  <code className="text-sm font-mono text-blue-600 dark:text-blue-400">
                    {fediverseHandle}
                  </code>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  위 핸들을 복사하여 연합우주 클라이언트에서 검색하고
                  팔로우하세요.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div className="flex flex-row space-x-2">
        {isCurrentUserBlogOwner && (
          <div className="space-x-2">
            <Button>
              <Link href={getBlogDashboardPath(targetBlog.slug)}>
                블로그 관리
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
