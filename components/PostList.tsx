import { encodePostId } from "@/lib/utils";
import formatInTimeZone from "date-fns-tz/formatInTimeZone";
import Link from "next/link";

export default function PostList({
  name,
  blog,
  posts,
  showTitle,
  embed = false,
  showTime = true,
  titleClassName,
}: {
  name: string;
  blog: any;
  posts: any[];
  showTitle: boolean;
  embed?: boolean;
  showTime?: boolean;
  titleClassName?: string;
}) {
  const dateFormat = showTime ? "yyyy-MM-dd HH:mm" : "yyyy-MM-dd";

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
                <Link
                  href={`/@${blog.slug}/${base62}`}
                  target={embed ? "_blank" : "_self"}
                >
                  {post.publishedAt ? (
                    <span className="font-bold tabular-nums">
                      {formatInTimeZone(
                        post.publishedAt,
                        "Asia/Seoul",
                        dateFormat
                      )}
                    </span>
                  ) : (
                    <span className="font-bold tabular-nums">
                      {formatInTimeZone(
                        post.updatedAt,
                        "Asia/Seoul",
                        dateFormat
                      )}
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
