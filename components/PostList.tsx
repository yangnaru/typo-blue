import Link from "next/link";
import { GroupHeading } from "@/components/day-heading";
import { formatSeoulDate, seoulDay } from "@/lib/dates";
import { getBlogPostPath } from "@/lib/paths";
import type { Blog, Post } from "@/lib/db";

// A blog's posts under a heading for each year, each row its title with the
// day at the end. A blog rarely posts twice in a day, so the list is grouped by
// year rather than by day.
export default function PostList({
  name,
  blog,
  posts,
  showTitle,
  titleClassName,
}: {
  name: string;
  blog: Pick<Blog, "slug">;
  posts: Post[];
  showTitle: boolean;
  titleClassName?: string;
}) {
  const years: { year: string; posts: { post: Post; date: Date }[] }[] = [];
  for (const post of posts) {
    const date = post.published
      ? post.first_published || post.published
      : post.updated;
    const year = seoulDay(date).slice(0, 4);
    const last = years.at(-1);
    if (last?.year === year) last.posts.push({ post, date });
    else years.push({ year, posts: [{ post, date }] });
  }

  return (
    <>
      {showTitle && (
        <h3 className={titleClassName ? titleClassName : "text-xl"}>{name}</h3>
      )}
      {posts.length === 0 ? (
        <p>아직 글이 없습니다.</p>
      ) : (
        // The same room around each year's rule as around the footer's.
        <div className="space-y-8">
          {years.map(({ year, posts }) => (
            <section key={year} className="space-y-3">
              <GroupHeading>
                <span className="tabular-nums">{year}년</span>
              </GroupHeading>
              <ul className="space-y-2">
                {posts.map(({ post, date }) => (
                  <li
                    key={post.id}
                    className="flex flex-row items-baseline justify-between gap-3"
                  >
                    <Link
                      href={getBlogPostPath(blog.slug, post.id)}
                      prefetch
                      className="break-keep tabular-nums"
                    >
                      {post.title?.length === 0 ? "무제" : post.title}
                      {!post.published && (
                        <span className="text-neutral-500"> (초안)</span>
                      )}
                    </Link>
                    <span className="shrink-0 text-neutral-500 text-sm tabular-nums">
                      {formatSeoulDate(date, { year: false })}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
