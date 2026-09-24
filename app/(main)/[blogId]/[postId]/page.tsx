import { getCurrentSession } from "@/lib/auth";
import { formatInTimeZone } from "date-fns-tz";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageViewTracker } from "@/components/PageViewTracker";
import { getBlogPostEditPath, getBlogPostPath } from "@/lib/paths";
import { db } from "@/lib/db";
import { blog, postTable, user } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { incrementVisitorCount } from "@/lib/actions/blog";
import sanitize from "sanitize-html";
import { notFound } from "next/navigation";

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
    with: {
      blog: {
        with: {
          actor: true,
          user: true,
        },
      },
    },
  });

  if (!targetPost) {
    notFound();
  }

  if (!targetPost.published && targetPost.blog.user.id !== user?.id) {
    notFound();
  }

  const blogName = targetPost.blog.name ?? `@${targetPost.blog.slug}`;
  const blogDescription = targetPost.blog.description ?? "";
  const postTitle = targetPost.title === "" ? "무제" : targetPost.title;

  return {
    title: postTitle,
    description: blogName + (blogDescription ? ` — ${blogDescription}` : ""),
    ...(targetPost.blog.actor?.id
      ? {
          alternates: {
            types: {
              "application/activity+json": [
                {
                  url: `https://${process.env.NEXT_PUBLIC_DOMAIN}/ap/notes/${targetPost.id}`,
                },
              ],
            },
          },
        }
      : {}),
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
    notFound();
  }

  const targetBlogUser = await db.query.user.findFirst({
    where: eq(user.id, targetBlog.userId),
  });

  if (!targetBlogUser) {
    notFound();
  }

  const isCurrentUserBlogOwner = targetBlogUser.email === sessionUser?.email;

  const uuid = (await props.params).postId;
  // If the postId is not a valid UUID, return a 404 error
  if (
    !uuid.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  ) {
    notFound();
  }

  const targetPost = await db.query.postTable.findFirst({
    where: eq(postTable.id, uuid),
  });

  if (!targetPost || (!targetPost.published && !isCurrentUserBlogOwner)) {
    notFound();
  }

  await incrementVisitorCount(targetBlog.id);

  return (
    <div className="space-y-8">
      <PageViewTracker blogId={targetBlog.id} postId={targetPost.id} />

      <div className="flex flex-row gap-2 items-baseline flex-wrap">
        <h3 className="text-2xl break-keep">
          <Link href={getBlogPostPath(targetBlog.slug, targetPost.id)}>
            {targetPost.title === "" ? "무제" : targetPost.title}
          </Link>
        </h3>
        <span className="text-neutral-500">
          {formatInTimeZone(
            targetPost.first_published ??
              targetPost.published ??
              targetPost.updated,
            "Asia/Seoul",
            "yyyy-MM-dd HH:mm"
          )}
          {!targetPost.published && " (초안)"}
        </span>
      </div>
      <div
        className="prose dark:prose-invert break-keep"
        dangerouslySetInnerHTML={{
          __html: sanitize(targetPost.content ?? "", {
            allowedTags: sanitize.defaults.allowedTags.concat(["img"]),
            allowedAttributes: {
              ...sanitize.defaults.allowedAttributes,
              img: ["src", "alt", "title", "width", "height", "loading"],
            },
            allowedSchemes: ["https"],
          }),
        }}
      />
      {isCurrentUserBlogOwner && (
        <div className="flex flex-row space-x-2">
          <Button asChild>
            <Link href={getBlogPostEditPath(slug, targetPost.id)}>수정</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
