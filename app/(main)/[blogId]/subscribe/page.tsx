import { db } from "@/lib/db";
import { blog } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import MailingListSubscription from "@/components/MailingListSubscription";
import { FediverseHandle } from "@/components/fediverse-handle";
import { CopyButton } from "@/components/copy-button";
import { getActorForBlog } from "@/lib/activitypub";

type Params = Promise<{
  blogId: string;
}>;

async function getBlog(params: Params) {
  const blogId = decodeURIComponent((await params).blogId);
  if (!blogId.startsWith("@")) return null;
  return (
    (await db.query.blog.findFirst({
      where: eq(blog.slug, blogId.replace("@", "")),
    })) ?? null
  );
}

export async function generateMetadata(props: {
  params: Params;
}): Promise<Metadata> {
  const targetBlog = await getBlog(props.params);
  if (!targetBlog) {
    return { title: "존재하지 않는 블로그입니다." };
  }

  return { title: `구독 · ${targetBlog.name ?? `@${targetBlog.slug}`}` };
}

// The ways to follow a blog, moved here so the blog's first page is only its
// posts: the mailing list, and the fediverse handle when the blog has one.
export default async function BlogSubscribe(props: { params: Params }) {
  const targetBlog = await getBlog(props.params);
  if (!targetBlog) {
    notFound();
  }

  const fediverseHandle = (await getActorForBlog(targetBlog.id))
    ? `@${targetBlog.slug}@${process.env.NEXT_PUBLIC_DOMAIN}`
    : null;

  return (
    <div className="space-y-8">
      <MailingListSubscription
        blogId={targetBlog.id}
        blogName={targetBlog.name || `@${targetBlog.slug}`}
      />

      {fediverseHandle && (
        <div className="space-y-2">
          <h3 className="text-normal font-bold">연합우주 팔로우</h3>
          <p className="text-neutral-500">
            마스토돈, 미스키 등에서 이 핸들을 검색해 팔로우할 수 있습니다.
          </p>
          <div className="flex flex-row flex-wrap items-baseline gap-2">
            <FediverseHandle
              handle={fediverseHandle}
              className="font-mono text-blue-500 break-all select-all"
            />
            <CopyButton text={fediverseHandle} />
          </div>
        </div>
      )}
    </div>
  );
}
