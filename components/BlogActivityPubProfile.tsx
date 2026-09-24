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
    <div className="space-y-2">
      {profile ? (
        <>
          <p>
            핸들: <code className="select-all">{profile.handle}</code>
          </p>
          <p>
            이름: {profile.name}{" "}
            <Link
              href={getBlogSettingsPath(blogSlug)}
              className="text-neutral-500 text-sm"
            >
              (블로그 제목이 연합우주에서의 이름으로 쓰입니다)
            </Link>
          </p>
          {profile.summary && <p>설명: {profile.summary}</p>}
          <p className="text-neutral-500">
            마스토돈, 미스키 등 연합우주 사용자들이{" "}
            <span className="select-all">{profile.handle}</span>을 팔로우하면
            새 글이 발행될 때 받아볼 수 있습니다.
          </p>
        </>
      ) : (
        <>
          <p>이 블로그는 아직 연합우주에 연결되어 있지 않습니다.</p>
          <ul className="list-disc list-inside text-neutral-500">
            <li>연결하면 블로그를 연합우주에서 찾을 수 있습니다.</li>
            <li>마스토돈 등의 사용자들이 새 글을 팔로우할 수 있습니다.</li>
            <li>연합우주에서의 반응(댓글, 리액션 등)을 알림으로 받습니다.</li>
          </ul>
          <ActivityPubSetupButton blogSlug={blogSlug} />
        </>
      )}
    </div>
  );
}
