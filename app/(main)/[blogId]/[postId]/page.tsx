import { getCurrentSession } from "@/lib/auth";
import { encodePostId } from "@/lib/utils";
import { decode } from "@urlpack/base62";
import { formatInTimeZone } from "date-fns-tz";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getBlogPostEditPath } from "@/lib/paths";
import { db } from "@/lib/db";
import { blog, post, user } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { incrementVisitorCount } from "@/lib/actions/blog";

type MetadataParams = Promise<{
  postId: string;
}>;

export async function generateMetadata(props: {
  params: MetadataParams;
}): Promise<Metadata> {
  const { user } = await getCurrentSession();

  let uuid;
  try {
    uuid = Buffer.from(decode((await props.params).postId)).toString("hex");
  } catch (e) {
    return {
      title: "존재하지 않는 글입니다.",
    };
  }

  if (uuid.length !== 32) {
    return {
      title: "존재하지 않는 글입니다.",
    };
  }

  const targetPost = await db.query.post.findFirst({
    where: eq(post.id, uuid),
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

  let targetPost;
  try {
    const uuid = Buffer.from(decode((await props.params).postId)).toString(
      "hex"
    );
    targetPost = await db.query.post.findFirst({
      where: eq(post.id, uuid),
    });
  } catch {
    return <p>글이 존재하지 않습니다.</p>;
  }

  if (!targetPost || (!targetPost.published && !isCurrentUserBlogOwner)) {
    return <p>글이 존재하지 않습니다.</p>;
  }

  await incrementVisitorCount(targetBlog.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-row gap-2 items-baseline flex-wrap">
        <h3 className="text-2xl break-keep">
          <Link href={`/@${targetBlog.slug}/${encodePostId(targetPost.id)}`}>
            {targetPost.title === "" ? "무제" : targetPost.title}
          </Link>
        </h3>
        <span className="text-neutral-500">
          {formatInTimeZone(
            targetPost.first_published ?? targetPost.published ?? targetPost.updated,
            "Asia/Seoul",
            "yyyy-MM-dd HH:mm"
          )}
        </span>
      </div>
      <div
        className="prose dark:prose-invert break-keep"
        dangerouslySetInnerHTML={{ __html: targetPost.content ?? "" }}
      />
      {isCurrentUserBlogOwner && (
        <div className="flex flex-row space-x-2">
          <Button asChild>
            <Link href={getBlogPostEditPath(slug, (await props.params).postId)}>
              수정
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
