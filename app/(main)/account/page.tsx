import BlogInfo from "@/components/BlogInfo";
import AccountDeletion from "@/components/AccountDeletion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="container max-w-4xl mx-auto py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">계정 설정</h1>
          <p className="text-muted-foreground">
            계정 정보를 관리하고 블로그를 설정하세요.
          </p>
        </div>

        {targetUser && (
          <Card>
            <CardHeader>
              <CardTitle>계정 정보</CardTitle>
              <CardDescription>
                기본 계정 정보를 확인하고 수정하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    이메일 주소
                  </label>
                  <p className="text-sm font-mono mt-1 select-all">
                    {targetUser.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    가입일
                  </label>
                  <p className="text-sm mt-1">
                    {format(new Date(targetUser.created), "yyyy년 M월 d일")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="default">
                  <Link href={getAccountChangeEmailPath()}>이메일 변경</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={getAccountSetPasswordPath()}>비밀번호 설정</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>내 블로그</CardTitle>
            <CardDescription>
              블로그를 관리하고 새로운 글을 작성하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {targetUser.blogs.length > 0 ? (
              <BlogInfo
                key={targetUser.blogs[0].slug}
                blog={targetUser.blogs[0]}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  아직 블로그가 없습니다. 새로운 블로그를 만들어보세요.
                </p>
                <Button asChild>
                  <Link href={getBlogNewPath()}>블로그 만들기</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">위험 영역</CardTitle>
            <CardDescription>
              이 작업들은 되돌릴 수 없으니 신중하게 진행하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AccountDeletion />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
