import PostList from "@/components/PostList";
import MailingListSubscription from "@/components/MailingListSubscription";
import { PageViewTracker } from "@/components/PageViewTracker";
import { PlainButton } from "@/components/plain-button";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBlogNewPostPath, getBlogPostsPath } from "@/lib/paths";
import { blog, postTable } from "@/drizzle/schema";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { Metadata } from "next";
import Link from "next/link";
import { incrementVisitorCount } from "@/lib/tracking";
import { notFound } from "next/navigation";
import { getActorForBlog } from "@/lib/activitypub";

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
      actor: true,
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
        ...(targetBlog.actor
          ? {
              "application/activity+json": [
                {
                  url: `https://${process.env.NEXT_PUBLIC_DOMAIN}/ap/users/${targetBlog.slug}`,
                },
              ],
            }
          : {}),
      },
    },
  };
}

type Params = Promise<{
  blogId: string;
}>;

export default async function BlogHome(props: { params: Params }) {
  const { user: sessionUser } = await getCurrentSession();

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
    notFound();
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
            <div className="space-y-1">
              <p className="text-neutral-500 text-sm">
                마스토돈, 미스키 등 연합우주에서 팔로우할 수 있습니다.
              </p>
              <code className="text-sm font-mono text-blue-500 select-all">
                {fediverseHandle}
              </code>
            </div>
          )}
        </>
      )}

      {isCurrentUserBlogOwner && (
        <div className="flex flex-row gap-2">
          <PlainButton asChild>
            <Link href={getBlogNewPostPath(targetBlog.slug)}>새 글 작성</Link>
          </PlainButton>
          <PlainButton asChild>
            <Link href={getBlogPostsPath(targetBlog.slug)}>블로그 관리</Link>
          </PlainButton>
        </div>
      )}
    </div>
  );
}
