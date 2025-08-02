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
  getBlogHomePath,
  getBlogNewPath,
  getBlogPostsPath,
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
              <div className="space-y-6">
                {targetUser.blogs.map((blog) => {
                  const publishedPosts = blog.posts.filter(
                    (post) => post.published
                  );
                  const draftPosts = blog.posts.filter(
                    (post) => !post.published
                  );
                  const recentPosts = blog.posts
                    .sort(
                      (a, b) =>
                        new Date(b.created).getTime() -
                        new Date(a.created).getTime()
                    )
                    .slice(0, 3);

                  return (
                    <div key={blog.slug} className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div>
                            <Link
                              href={getBlogHomePath(blog.slug)}
                              className="text-lg font-semibold hover:underline inline-flex items-center gap-2"
                            >
                              @{blog.slug} {blog.name && `(${blog.name})`}
                              <svg
                                className="h-4 w-4 text-muted-foreground"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-1M14 1h6m0 0v6m0-6L10 11"
                                />
                              </svg>
                            </Link>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">개설일</p>
                              <p className="font-medium">
                                {format(
                                  new Date(blog.created),
                                  "yyyy년 M월 d일"
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">발행된 글</p>
                              <p className="font-medium">
                                {publishedPosts.length}개
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">임시저장</p>
                              <p className="font-medium">
                                {draftPosts.length}개
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">전체 글</p>
                              <p className="font-medium">
                                {blog.posts.length}개
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button asChild size="sm">
                            <Link href={getBlogPostsPath(blog.slug)}>
                              블로그 관리
                            </Link>
                          </Button>
                          <Button asChild variant="outline" size="sm">
                            <Link href={getBlogHomePath(blog.slug)}>
                              블로그 보기
                            </Link>
                          </Button>
                        </div>
                      </div>

                      {recentPosts.length > 0 && (
                        <div className="space-y-3 pt-4 border-t">
                          <h5 className="text-sm font-medium text-muted-foreground">
                            최근 글
                          </h5>
                          <div className="space-y-2">
                            {recentPosts.map((post) => (
                              <div
                                key={post.id}
                                className="flex items-center justify-between gap-3 py-2 px-3 rounded-md bg-muted/50"
                              >
                                <div className="flex-1 min-w-0">
                                  <Link
                                    href={`/${blog.slug}/${post.id}`}
                                    className="text-sm font-medium hover:underline line-clamp-1"
                                  >
                                    {post.title || "제목 없음"}
                                  </Link>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs text-muted-foreground">
                                      {format(
                                        new Date(post.created),
                                        "M월 d일"
                                      )}
                                    </span>
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded-full ${
                                        post.published
                                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                      }`}
                                    >
                                      {post.published ? "발행됨" : "임시저장"}
                                    </span>
                                  </div>
                                </div>
                                <svg
                                  className="h-4 w-4 text-muted-foreground flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              </div>
                            ))}
                          </div>
                          {blog.posts.length > 3 && (
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="w-full"
                            >
                              <Link href={getBlogPostsPath(blog.slug)}>
                                모든 글 보기 ({blog.posts.length}개)
                              </Link>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="h-8 w-8 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold mb-2">
                  아직 블로그가 없습니다
                </h4>
                <p className="text-muted-foreground mb-6">
                  새로운 블로그를 만들어 여러분의 이야기를 공유해보세요.
                </p>
                <Button asChild>
                  <Link href={getBlogNewPath()}>블로그 만들기</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-destructive flex items-center gap-2">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              위험 영역
            </CardTitle>
            <CardDescription className="text-destructive/80">
              이 작업들은 되돌릴 수 없으니 신중하게 진행하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <AccountDeletion />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
