import { encodePostId } from "@/lib/utils";
import { Blog, Guestbook, User } from "@prisma/client";
import GuestbookDetail from "./GuestbookDetail";
import { User as LuciaUser } from "lucia";

export default function GuestbookList({
  currentUser,
  blog,
  guestbook,
}: {
  currentUser: LuciaUser | null;
  blog: Blog;
  guestbook: (Guestbook & { author: User })[];
}) {
  return guestbook.length === 0 ? (
    <p>방명록에 아직 글이 없습니다.</p>
  ) : (
    <ul className="space-y-2">
      {guestbook.map((guestbook) => {
        const isReplyable = blog.userId === currentUser?.id && !guestbook.reply;

        return (
          <li key={encodePostId(guestbook.uuid)}>
            <GuestbookDetail
              currentUser={currentUser}
              guestbook={guestbook}
              blog={blog}
              isReplyable={isReplyable}
            />
          </li>
        );
      })}
    </ul>
  );
}
