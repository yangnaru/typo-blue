import BlogInfo from "@/components/BlogInfo";
import AccountDeletion from "@/components/AccountDeletion";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getAccountChangeEmailPath,
  getAccountSetPasswordPath,
  getBlogNewPath,
} from "@/lib/paths";
import format from "date-fns/format";
import Link from "next/link";

export default async function AccountHome() {
  const { user: currentUser } = await getCurrentSession();

  if (!currentUser) {
    return <p>로그인이 필요합니다.</p>;
  }

  const targetUser = await db.query.user.findFirst({
    where: (user, { eq }) => eq(user.email, currentUser.email),
    with: {
      blogs: {
        with: {
          posts: true,
        },
      },
    },
  });

  if (!targetUser) {
    return <p>로그인이 필요합니다.</p>;
  }

  return (
    <div>
      <div className="space-y-8 mt-6">
        {targetUser && (
          <div className="space-y-4">
            <h3 className="text-lg">계정 정보</h3>
            <div className="flex flex-col gap-4">
              <div>
                <p>이메일 주소: {targetUser.email}</p>
                <p>
                  가입일:{" "}
                  {format(new Date(targetUser.created), "yyyy년 M월 d일")}
                </p>
              </div>
              <div className="flex flex-row space-x-2 items-center align-baseline">
                <Button asChild>
                  <Link href={getAccountChangeEmailPath()}>이메일 변경</Link>
                </Button>
                <Button asChild>
                  <Link href={getAccountSetPasswordPath()}>비밀번호 설정</Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-lg">내 블로그</h3>
          <div className="space-y-4">
            {targetUser.blogs.length > 0 ? (
              <BlogInfo
                key={targetUser.blogs[0].slug}
                blog={targetUser.blogs[0]}
              />
            ) : (
              <Button asChild>
                <Link href={getBlogNewPath()}>블로그 만들기</Link>
              </Button>
            )}
          </div>
        </div>

        <AccountDeletion />
      </div>
    </div>
  );
}
