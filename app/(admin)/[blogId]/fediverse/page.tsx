import { formatInTimeZone } from "date-fns-tz";
import { getRootPath } from "@/lib/paths";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { blog, actorTable, followingTable } from "@/drizzle/schema";
import { getActorForBlog } from "@/lib/activitypub";
import { DisableFederationButton } from "@/components/DisableFederationButton";
import { BlogActivityPubProfile } from "@/components/BlogActivityPubProfile";
import Link from "next/link";

type PageProps = Promise<{
  blogId: string;
}>;

export default async function FediversePage(props: { params: PageProps }) {
  const { blogId } = await props.params;

  const { user: sessionUser } = await getCurrentSession();

  const decodedBlogId = decodeURIComponent(blogId);
  const slug = decodedBlogId.replace("@", "");
  const currentBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, slug),
  });

  if (!currentBlog) {
    redirect(getRootPath());
  }

  if (!sessionUser || sessionUser.id !== currentBlog?.userId) {
    redirect(getRootPath());
  }
  const blogActor = alias(actorTable, "blogActor");
  const followerActor = alias(actorTable, "followerActor");

  const follows = await db
    .select({
      follower: followerActor,
      followingInfo: followingTable,
    })
    .from(followingTable)
    .innerJoin(followerActor, eq(followerActor.id, followingTable.followerId))
    .innerJoin(blogActor, eq(blogActor.id, followingTable.followeeId))
    .where(
      and(
        eq(blogActor.blogId, currentBlog.id),
        isNotNull(followingTable.accepted)
      )
    );

  // Check if ActivityPub is enabled for this blog
  let activityPubEnabled = false;
  try {
    const actor = await getActorForBlog(currentBlog.id);
    activityPubEnabled = !!actor;
  } catch (error) {
    console.error("Failed to fetch ActivityPub profile:", error);
  }

  // Fetch ActivityPub profile data
  let activityPubProfile: {
    handle: string;
    uri: string;
    name?: string | null;
    summary?: string | null;
  } | null = null;

  try {
    const actor = await getActorForBlog(currentBlog.id);
    if (actor) {
      activityPubProfile = {
        handle: actor.handle,
        uri: actor.iri,
        name: actor.name,
        summary: actor.bioHtml,
      };
    }
  } catch (error) {
    console.error("Failed to fetch ActivityPub profile:", error);
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h3 className="text-xl">연합우주</h3>
        <BlogActivityPubProfile
          blogSlug={currentBlog.slug}
          profile={activityPubProfile}
        />
      </section>

      {activityPubEnabled && (
        <section className="space-y-2">
          <h3 className="text-lg">팔로워 ({follows.length}명)</h3>
          {follows.length === 0 ? (
            <p className="text-neutral-500">아직 팔로워가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {follows.map((follow) => (
                <li key={follow.follower.id} className="break-all">
                  {follow.followingInfo.accepted && (
                    <span className="font-bold tabular-nums">
                      {formatInTimeZone(
                        follow.followingInfo.accepted,
                        "Asia/Seoul",
                        "yyyy-MM-dd"
                      )}{" "}
                    </span>
                  )}
                  {follow.follower.name ?? (
                    <span className="text-neutral-500">이름 없음</span>
                  )}{" "}
                  <Link
                    href={follow.follower.url ?? follow.follower.iri}
                    target="_blank"
                    className="text-neutral-500"
                  >
                    {follow.follower.handle}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activityPubEnabled && (
        <section className="space-y-2">
          <h3 className="text-lg">연합우주 연결 끊기</h3>
          <p className="text-neutral-500">
            연합우주 연동을 비활성화하고 모든 게시물을 연합우주에서 제거합니다.
          </p>
          <DisableFederationButton blogSlug={slug} />
        </section>
      )}
    </div>
  );
}
