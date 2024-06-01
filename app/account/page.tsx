import BlogInfo from "@/components/BlogInfo";
import LinkButton from "@/components/LinkButton";
import { lucia, validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import format from "date-fns/format";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AccountHome() {
  const { user: currentUser } = await validateRequest();

  if (!currentUser) {
    return <p>로그인이 필요합니다.</p>;
  }

  const user = await prisma.user.findUnique({
    where: {
      email: currentUser.email,
    },
    include: {
      blog: {
        include: {
          posts: true,
        },
      },
    },
  });

  if (!user) {
    return <p>로그인이 필요합니다.</p>;
  }

  return (
    <div>
      <div className="space-y-8 mt-6">
        {user && (
          <div className="space-y-4">
            <h3 className="text-lg">계정 정보</h3>
            <div className="flex flex-col gap-4">
              <div>
                <p>이메일 주소: {user.email}</p>
                <p>
                  가입일: {format(new Date(user.createdAt), "yyyy년 M월 d일")}
                </p>
              </div>
              <div className="flex flex-row space-x-2 items-center align-baseline">
                <form action={logout}>
                  <button className="border border-red-500 rounded-sm p-2">
                    로그아웃
                  </button>
                </form>
                <LinkButton href="/account/change-email" className="p-2">
                  이메일 변경
                </LinkButton>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-lg">내 블로그</h3>
          <div className="space-y-4">
            {user.blog ? (
              <BlogInfo key={user.blog.slug} blog={user.blog} />
            ) : (
              <LinkButton href="/blogs/new" className="p-2">
                블로그 만들기
              </LinkButton>
            )}
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
