import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActivityPubSetupButton } from "@/components/ActivityPubSetupButton";

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
                <code className="ml-2 px-2 py-1 bg-muted rounded text-sm">
                  {profile.handle}
                </code>
              </div>

              {profile.name && (
                <div>
                  <span className="font-medium">표시 이름:</span>
                  <span className="ml-2">{profile.name}</span>
                </div>
              )}

              {profile.summary && (
                <div>
                  <span className="font-medium">설명:</span>
                  <p className="ml-2 mt-1 text-sm text-muted-foreground">
                    {profile.summary}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 text-sm text-muted-foreground">
              <p>
                블로그가 이제 연합우주에서 발견 가능합니다! 마스토돈, 플레로마
                및 기타 ActivityPub 호환 플랫폼의 사용자들이{" "}
                <strong>{profile.handle}</strong>에서 블로그를 팔로우하여 새 글
                발행 시 업데이트를 받을 수 있습니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">상태</span>
              <Badge variant="outline">설정되지 않음</Badge>
            </div>

            <p className="text-sm text-muted-foreground">
              이 블로그에 ActivityPub 연합이 활성화되어 있지 않습니다.
              활성화하면 블로그가 연합우주에서 발견 가능해지고 마스토돈 등의
              플랫폼 사용자들이 업데이트를 팔로우할 수 있습니다.
            </p>

            <ActivityPubSetupButton blogSlug={blogSlug} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
