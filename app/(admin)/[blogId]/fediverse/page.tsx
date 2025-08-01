import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import formatInTimeZone from "date-fns-tz/formatInTimeZone";
import Image from "next/image";
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

  // Fetch followers
  let followers: Array<{
    id: string;
    handle: string;
    username: string;
    instanceHost: string;
    name: string | null;
    avatarUrl: string | null;
    followedAt: Date | null;
  }> = [];

  try {
    // Get followers by finding actors that follow this blog's actor
    const blogActor = alias(actorTable, "blogActor");
    const followerActor = alias(actorTable, "followerActor");

    const followersResult = await db
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

    followers = followersResult.map((f) => ({
      id: f.follower.id,
      handle: f.follower.handle,
      username: f.follower.username,
      instanceHost: f.follower.instanceHost,
      name: f.follower.name,
      avatarUrl: f.follower.avatarUrl,
      followedAt: f.followingInfo.accepted || f.followingInfo.created,
    }));
  } catch (error) {
    console.error("Failed to fetch followers:", error);
  }

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
    <div className="space-y-6">
      <BlogActivityPubProfile
        blogSlug={currentBlog.slug}
        profile={activityPubProfile}
      />

      {/* Followers List */}
      {activityPubEnabled && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>팔로워 목록</CardTitle>
              <CardDescription>
                연합우주에서 이 블로그를 팔로우하는 사용자들 ({followers.length}
                명)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {followers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mb-4">
                    <svg
                      className="mx-auto h-12 w-12 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-muted-foreground">
                    아직 팔로워가 없습니다
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    설정 페이지에서 연합우주를 활성화하면 여기서 팔로워를 확인할
                    수 있습니다.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>사용자</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        연합우주 핸들
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        인스턴스
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        팔로우 일시
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {followers.map((follower) => (
                      <TableRow key={follower.id}>
                        <TableCell className="flex flex-row gap-3 items-center">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {follower.name || follower.username}
                            </span>
                            {follower.name && (
                              <span className="text-sm text-muted-foreground">
                                @{follower.username}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                            {follower.handle}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary">
                            {follower.instanceHost}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {follower.followedAt && (
                            <span className="text-sm text-muted-foreground">
                              {formatInTimeZone(
                                follower.followedAt,
                                "Asia/Seoul",
                                "yyyy년 MM월 dd일 HH:mm"
                              )}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Disable Federation Button */}
      {activityPubEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>연합우주 비활성화</CardTitle>
            <CardDescription>
              연합우주 연동을 완전히 비활성화하고 모든 게시물을 연합우주에서
              제거합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DisableFederationButton blogSlug={slug} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
