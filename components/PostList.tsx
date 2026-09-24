import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import { getBlogPostPath } from "@/lib/paths";

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
            return (
              <li key={post.id} className="break-keep">
                <Link
                  href={getBlogPostPath(blog.slug, post.id)}
                  target={embed ? "_blank" : "_self"}
                >
                  <span className="font-bold tabular-nums">
                    {formatInTimeZone(
                      post.published
                        ? post.first_published || post.published
                        : post.updated,
                      "Asia/Seoul",
                      dateFormat
                    )}
                  </span>{" "}
                  {post.title?.length === 0 ? "무제" : post.title}
                  {!post.published && (
                    <span className="text-neutral-500"> (초안)</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
