import { encodePostId } from "@/lib/server-util";
import { Blog, Post } from "@prisma/client";
import format from "date-fns/format";
import Link from "next/link";

export default function PostList({
  name,
  blog,
  posts,
  showTitle,
  titleClassName,
}: {
  name: string;
  blog: Blog;
  posts: Post[];
  showTitle: boolean;
  titleClassName?: string;
}) {
  return (
    <>
      {showTitle && (
        <h3 className={titleClassName ? titleClassName : "text-xl"}>{name}</h3>
      )}
      {posts.length === 0 ? (
        <p>아직 글이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {posts.map((post) => {
            const base62 = encodePostId(post.uuid);

            return (
              <li key={encodePostId(post.uuid)}>
                <Link href={`/@${blog.slug}/${base62}`}>
                  {post.publishedAt ? (
                    <span className="font-bold tabular-nums">
                      {format(new Date(post.publishedAt), "yyyy-MM-dd HH:mm")}
                    </span>
                  ) : (
                    <span className="font-bold tabular-nums">
                      {format(new Date(post.updatedAt), "yyyy-MM-dd HH:mm")}
                    </span>
                  )}{" "}
                  {post.title?.length === 0 ? "무제" : post.title}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
