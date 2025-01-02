import GuestbookDetail from "@/components/GuestbookDetail";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decode } from "@urlpack/base62";

export default async function GuestbookDetailPage(
  props: {
    params: Promise<{ blogId: string; guestbookId: string }>;
  }
) {
  const params = await props.params;

  const {
    blogId,
    guestbookId
  } = params;

  const { user: currentUser } = await validateRequest();

  const blog = await prisma.blog.findUnique({
    where: {
      slug: blogId.replace("%40", ""),
    },
    include: {
      guestbook: {
        where: {
          uuid: Buffer.from(decode(guestbookId)).toString("hex"),
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

  if (blog.guestbook.length === 0) {
    return <p>존재하지 않는 방명록입니다.</p>;
  }

  const guestbook = blog.guestbook[0];

  return (
    <div className="space-y-4">
      <h3 className="text-xl">방명록</h3>
      <GuestbookDetail
        blog={blog}
        guestbook={guestbook}
        currentUser={currentUser}
        isReplyable={blog.userId === currentUser?.id}
      />
    </div>
  );
}
