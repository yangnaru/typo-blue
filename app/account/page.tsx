import BlogInfo from "@/components/BlogInfo";
import LinkButton from "@/components/LinkButton";
import { validateRequest } from "@/lib/auth";
import { MAX_BLOGS_PER_USER } from "@/lib/const";
import { prisma } from "@/lib/db";
import format from "date-fns/format";

export default async function AccountHome() {
  const { user: currentUser } = await validateRequest();

  const user = await prisma.user.findUnique({
    where: {
      email: currentUser?.email,
    },
  });

  const blogs = await prisma.blog.findMany({
    where: {
      user: {
        email: currentUser?.email,
      },
    },
    include: {
      posts: {
        select: {
          id: true,
        },
      },
    },
  });

  return (
    <div>
      {user?.email ? (
        <div className="space-y-8 mt-6">
          {user && (
            <div className="space-y-4">
              <h3 className="text-lg">계정 정보</h3>
              <div className="flex flex-row place-content-between justify-self-auto items-center">
                <div>
                  <p>이메일 주소: {user.email}</p>
                  <p>
                    가입일: {format(new Date(user.createdAt), "yyyy년 M월 d일")}
                  </p>
                </div>
                <button
                  className="border border-red-500 rounded-sm p-1"
                  //   onClick={() => {
                  //     if (confirm("정말 로그아웃 하시겠습니까?")) signOut();
                  //   }}
                >
                  로그아웃
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg">개설된 블로그</h3>
            <div className="space-y-4">
              {blogs?.length !== 0 ? (
                blogs?.map((blog) => <BlogInfo key={blog.slug} blog={blog} />)
              ) : (
                <p>개설된 블로그가 없습니다.</p>
              )}
              <div>
                {blogs && blogs.length >= MAX_BLOGS_PER_USER ? (
                  <p>최대 개설 가능한 블로그 수에 도달했습니다.</p>
                ) : (
                  <LinkButton href="/blogs/new" className="p-2">
                    새 블로그 만들기
                  </LinkButton>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p>로그인이 필요합니다.</p>
      )}
    </div>
  );
}
