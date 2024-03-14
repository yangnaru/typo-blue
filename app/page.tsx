import LinkButton from "@/components/LinkButton";
import LoginStatus from "@/components/LoginStatus";
import Logo from "@/components/Logo";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default function Home() {
  return (
    <main className="space-y-4">
      <Logo />
      <p>타이포 블루는 글로 자신을 표현하는 공간입니다.</p>

      <nav className="space-x-2 flex">
        <HomeWithSession />
      </nav>
    </main>
  );
}

async function HomeWithSession() {
  const { user } = await validateRequest();

  let blog;

  if (user) {
    blog = await prisma.blog.findUnique({
      where: {
        userId: user.id,
      },
      include: {
        posts: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  return (
    <div>
      <div className="flex flex-row items-baseline space-x-2">
        {user && !blog && (
          <LinkButton href="/blogs/new">블로그 만들기</LinkButton>
        )}
        <LoginStatus />
      </div>
    </div>
  );
}
