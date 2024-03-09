import BlogInfo from "@/components/BlogInfo";
import LinkButton from "@/components/LinkButton";
import { lucia, validateRequest } from "@/lib/auth";
import { MAX_BLOGS_PER_USER } from "@/lib/const";
import { prisma } from "@/lib/db";
import format from "date-fns/format";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AccountHome() {
  const { user: currentUser } = await validateRequest();

  if (!currentUser) {
    return <p>로그인이 필요합니다.</p>;
  }
  console.log(currentUser);

  const user = await prisma.user.findUnique({
    where: {
      email: currentUser.email,
    },
  });

  const blogs = await prisma.blog.findMany({
    where: {
      user: {
        email: currentUser.email,
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
              <form action={logout}>
                <button className="border border-red-500 rounded-sm p-1">
                  로그아웃
                </button>
              </form>
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
    </div>
  );
}

async function logout() {
  "use server";
  const { session } = await validateRequest();
  if (!session) {
    return {
      error: "Unauthorized",
    };
  }

  await lucia.invalidateSession(session.id);

  const sessionCookie = lucia.createBlankSessionCookie();
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );
  return redirect("/");
}
