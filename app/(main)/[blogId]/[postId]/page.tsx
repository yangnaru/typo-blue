import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encodePostId } from "@/lib/utils";
import { incrementVisitorCount, logView } from "@/lib/server-util";
import { Prisma } from "@prisma/client";
import { decode } from "@urlpack/base62";
import { formatInTimeZone } from "date-fns-tz";
import { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getBlogPostEditPath } from "@/lib/paths";

export async function generateMetadata(
  props: {
    params: Promise<{ postId: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const { user } = await validateRequest();

  let uuid;
  try {
    uuid = Buffer.from(decode(params.postId)).toString("hex");
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

  const post = await prisma.post.findUnique({
    where: {
      uuid: uuid,
    },
    include: {
      blog: true,
    },
  });

  if (!post || !post.blog) {
    return {
      title: "존재하지 않는 글입니다.",
    };
  }

  if (!post.publishedAt && post.blog.userId !== user?.id) {
    return {
      title: "존재하지 않는 글입니다.",
    };
  }

  const blogName = post.blog.name ?? `@${post.blog.slug}`;
  const blogDescription = post.blog.description ?? "";
  const postTitle = post.title === "" ? "무제" : post.title;

  return {
    title: postTitle,
    description: blogName + (blogDescription ? ` — ${blogDescription}` : ""),
  };
}

export default async function BlogPost(
  props: {
    params: Promise<{ blogId: string; postId: string }>;
  }
) {
  const params = await props.params;
  const { user } = await validateRequest();

  const blogId = decodeURIComponent(params.blogId);
  if (!blogId.startsWith("@")) return <p>👀</p>;

  const slug = blogId.replace("@", "");
  const blog = await prisma.blog.findUnique({
    where: {
      slug: slug,
    },
    include: {
      user: true,
    },
  });

  if (!blog) {
    return <p>블로그가 존재하지 않습니다.</p>;
  }

  const isCurrentUserBlogOwner = blog.user.email === user?.email;

  let post;
  try {
    post = await prisma.post.findUnique({
      where: {
        deletedAt: null,
        uuid: Buffer.from(decode(params.postId)).toString("hex"),
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2023"
    ) {
      return <p>글이 존재하지 않습니다.</p>;
    }

    throw e;
  }

  if (!post || (!post.publishedAt && !isCurrentUserBlogOwner)) {
    return <p>글이 존재하지 않습니다.</p>;
  }

  await incrementVisitorCount(blog.id);

  const ip = ((await headers()).get("x-forwarded-for") ?? "127.0.0.1").split(",")[0];
  const userAgent = (await headers()).get("user-agent") ?? "";
  await logView({
    ip,
    userAgent,
    blogId: blog.id,
    postId: post.uuid,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-row gap-2 items-baseline flex-wrap">
        <h3 className="text-2xl break-keep">
          <Link href={`/@${blog.slug}/${encodePostId(post.uuid)}`}>
            {post.title === "" ? "무제" : post.title}
          </Link>
        </h3>
        <span className="text-neutral-500">
          {formatInTimeZone(
            post.publishedAt ?? post.updatedAt,
            "Asia/Seoul",
            "yyyy-MM-dd HH:mm"
          )}
        </span>
      </div>
      <div
        className="prose dark:prose-invert break-keep"
        dangerouslySetInnerHTML={{ __html: post.content ?? "" }}
      />
      {isCurrentUserBlogOwner && (
        <div className="flex flex-row space-x-2">
          <Button asChild>
            <Link href={getBlogPostEditPath(slug, params.postId)}>수정</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
