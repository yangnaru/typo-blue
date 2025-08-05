import { getCurrentSession } from "@/lib/auth";
import { formatInTimeZone } from "date-fns-tz";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageViewTracker } from "@/components/PageViewTracker";
import { getBlogPostEditPath, getRootPath } from "@/lib/paths";
import { db } from "@/lib/db";
import { blog, postTable, user } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { incrementVisitorCount } from "@/lib/actions/blog";
import sanitize from "sanitize-html";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Edit } from "lucide-react";
import { notFound } from "next/navigation";
import { BlogHeader } from "@/components/blog-header";

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

  // Get user blogs for header
  let userBlogs;
  if (sessionUser) {
    const currentUser = await db.query.user.findFirst({
      where: eq(user.id, sessionUser.id),
      with: {
        blogs: true,
      },
    });
    userBlogs = currentUser?.blogs;
  }

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
    <div className="min-h-screen flex flex-col">
      <BlogHeader 
        user={sessionUser} 
        userBlogs={userBlogs} 
        blogSlug={targetBlog.slug}
        blogName={targetBlog.name || undefined}
        isPostPage={true} 
      />
      <main className="flex-1">
        <article className="max-w-4xl mx-auto">
          <PageViewTracker blogId={targetBlog.id} postId={targetPost.id} />

      {/* Post Header */}
      <div className="pt-6 pb-3">
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
        <div
          className="prose dark:prose-invert max-w-none break-keep prose-headings:scroll-mt-24 prose-pre:bg-muted prose-pre:border"
          dangerouslySetInnerHTML={{
            __html: sanitize(targetPost.content ?? ""),
          }}
        />
      </div>

      <div className="py-4">
        <Separator />
      </div>
        </article>
      </main>
    </div>
  );
}
