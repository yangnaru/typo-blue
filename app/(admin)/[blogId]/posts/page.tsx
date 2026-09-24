import { PlainButton } from "@/components/plain-button";
import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import {
  getBlogNewPostPath,
  getBlogPostEditPath,
  getBlogPostPath,
  getRootPath,
} from "@/lib/paths";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Post } from "@/lib/db";
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

  if (!currentBlog) {
    redirect(getRootPath());
  }

  if (!sessionUser || sessionUser.id !== currentBlog?.userId) {
    redirect(getRootPath());
  }

  const draftPosts = currentBlog.posts
    .filter((post) => !post.published)
    .sort((a, b) => b.updated.getTime() - a.updated.getTime());
  const publishedPosts = currentBlog.posts.filter((post) => post.published);

  return (
    <div className="space-y-8">
      <OwnerPostList
        name="임시 저장된 글 목록"
        slug={slug}
        posts={draftPosts}
      />
      <OwnerPostList name="발행된 글 목록" slug={slug} posts={publishedPosts} />

      <PlainButton asChild>
        <Link href={getBlogNewPostPath(slug)}>새 글 쓰기</Link>
      </PlainButton>
    </div>
  );
}

function OwnerPostList({
  name,
  slug,
  posts,
}: {
  name: string;
  slug: string;
  posts: Post[];
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xl">{name}</h3>
      {posts.length === 0 ? (
        <p className="text-neutral-500">아직 글이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {posts.map((post) => (
            <li key={post.id} className="break-keep">
              <Link href={getBlogPostEditPath(slug, post.id)}>
                <span className="font-bold tabular-nums">
                  {formatInTimeZone(
                    post.first_published ?? post.published ?? post.updated,
                    "Asia/Seoul",
                    "yyyy-MM-dd HH:mm"
                  )}
                </span>{" "}
                {post.title === "" ? "무제" : post.title}
              </Link>
              <span className="text-neutral-500 text-sm">
                {post.emailSent && " · 이메일 발송됨"} ·{" "}
                <Link
                  href={getBlogPostPath(slug, post.id)}
                  target="_blank"
                  className="underline"
                >
                  보기
                </Link>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
