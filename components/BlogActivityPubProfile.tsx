import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActivityPubSetupButton } from "@/components/ActivityPubSetupButton";
import Link from "next/link";
import { getBlogSettingsPath } from "@/lib/paths";

interface ActivityPubProfileData {
  handle: string;
  uri: string;
  name?: string | null;
  summary?: string | null;
}

interface BlogActivityPubProfileProps {
  blogSlug: string;
  profile: ActivityPubProfileData | null;
}

export function BlogActivityPubProfile({
  blogSlug,
  profile,
}: BlogActivityPubProfileProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ActivityPub 연합</CardTitle>
        <CardDescription>블로그의 연합우주 통합을 활성화합니다</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <div>
                <span className="font-medium">핸들:</span>
                <code className="ml-2 px-2 py-1 bg-muted rounded text-sm select-all">
                  {profile.handle}
                </code>
              </div>

              <div>
                <span className="font-medium">이름:</span>
                <span className="ml-2">{profile.name}</span>
                <Link
                  href={getBlogSettingsPath(blogSlug)}
                  className="ml-2 text-sm text-muted-foreground"
                >
                  (블로그 제목이 연합우주에서의 이름으로 활용됩니다)
                </Link>
              </div>

              {profile.summary && (
                <div>
                  <span className="font-medium">설명:</span>
                  <span className="ml-2">{profile.summary}</span>
                </div>
              )}
            </div>

            <div className="pt-2 text-sm text-muted-foreground">
              <p>
                블로그가 이제 연합우주에서 발견 가능합니다! 마스토돈, 플레로마
                및 기타 ActivityPub 호환 플랫폼의 사용자들이{" "}
                <strong className="select-all">{profile.handle}</strong>에서
                블로그를 팔로우하여 새 글 발행 시 업데이트를 받을 수 있습니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">상태</span>
              <Badge variant="outline">설정되지 않음</Badge>
            </div>

            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              <li>이 블로그에 ActivityPub 연합이 활성화되어 있지 않습니다.</li>
              <li>활성화하면 블로그가 연합우주에서 발견 가능해집니다.</li>
              <li>
                마스토돈 등 ActivityPub 플랫폼 사용자들이 블로그의 업데이트를
                팔로우할 수 있습니다.
              </li>
              <li>
                연합우주에서의 반응(댓글, 리액션 등)을 타이포 블루에서 받아볼 수
                있습니다.
              </li>
            </ul>

            <ActivityPubSetupButton blogSlug={blogSlug} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
