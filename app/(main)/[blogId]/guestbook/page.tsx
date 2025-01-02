import GuestbookEditor from "@/components/GuestbookEditor";
import GuestbookList from "@/components/GuestbookList";
import { writeToGuestbook } from "@/lib/actions/blog";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function GuestbookPage(
  props: {
    params: Promise<{ blogId: string }>;
  }
) {
  const params = await props.params;

  const {
    blogId
  } = params;

  const { user } = await validateRequest();

  const blog = await prisma.blog.findUnique({
    where: {
      slug: blogId.replace("%40", ""),
    },
    include: {
      guestbook: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          author: true,
        },
      },
    },
  });

  if (!blog) {
    return <p>존재하지 않는 블로그입니다.</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl">방명록</h3>

      {user && user.id !== blog.userId && (
        <div className="space-y-2">
          <h1>방명록 남기기</h1>

          <form className="space-y-4" action={writeToGuestbook}>
            <input type="hidden" name="blogId" value={blog.slug} />
            <GuestbookEditor user={user} />
          </form>
        </div>
      )}

      {user === null && (
        <p>
          <Link href="/auth/signin" className="text-blue-500">
            로그인
          </Link>{" "}
          하고 방명록 쓰기.
        </p>
      )}

      <GuestbookList
        blog={blog}
        guestbook={blog.guestbook}
        currentUser={user}
      />
    </div>
  );
}
