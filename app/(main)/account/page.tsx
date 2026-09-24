import AccountDeletion from "@/components/AccountDeletion";
import { PlainButton } from "@/components/plain-button";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getAccountChangeEmailPath,
  getAccountSetPasswordPath,
  getBlogHomePath,
  getBlogNewPath,
  getBlogPostsPath,
} from "@/lib/paths";
import { format } from "date-fns";
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
    <div className="space-y-8 mt-6">
      <div className="space-y-4">
        <h3 className="text-lg">계정 정보</h3>
        <div>
          <p>이메일 주소: {targetUser.email}</p>
          <p>
            가입일: {format(new Date(targetUser.created), "yyyy년 M월 d일")}
          </p>
        </div>
        <div className="flex flex-row space-x-2">
          <PlainButton asChild>
            <Link href={getAccountChangeEmailPath()}>이메일 변경</Link>
          </PlainButton>
          <PlainButton asChild>
            <Link href={getAccountSetPasswordPath()}>비밀번호 설정</Link>
          </PlainButton>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg">내 블로그</h3>
        {targetUser.blogs.length > 0 ? (
          targetUser.blogs.map((blog) => (
            <div
              key={blog.slug}
              className="flex flex-row justify-between items-start gap-4"
            >
              <div>
                <Link
                  href={getBlogHomePath(blog.slug)}
                  className="font-bold"
                >
                  @{blog.slug} {blog.name && `(${blog.name})`}
                </Link>
                <p className="text-neutral-500">
                  개설일: {format(new Date(blog.created), "yyyy년 M월 d일")}
                </p>
                <p className="text-neutral-500">
                  글 수: {blog.posts.filter((post) => post.published).length}
                  개 (임시저장{" "}
                  {blog.posts.filter((post) => !post.published).length}개)
                </p>
              </div>
              <PlainButton asChild>
                <Link href={getBlogPostsPath(blog.slug)}>블로그 관리</Link>
              </PlainButton>
            </div>
          ))
        ) : (
          <PlainButton asChild>
            <Link href={getBlogNewPath()}>블로그 만들기</Link>
          </PlainButton>
        )}
      </div>

      <AccountDeletion />
    </div>
  );
}
