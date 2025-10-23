import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText } from "lucide-react";
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
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">아직 글이 없습니다</p>
          <p className="text-muted-foreground text-sm">
            첫 번째 글을 작성해보세요!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            return (
              <Card
                key={post.id}
                className="hover:shadow-md transition-shadow duration-200"
              >
                <CardContent className="p-4">
                  <Link
                    href={getBlogPostPath(blog.slug, post.id)}
                    target={embed ? "_blank" : "_self"}
                    className="block group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
                          {post.title?.length === 0 ? "무제" : post.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {post.published ? (
                            <span className="tabular-nums">
                              {formatInTimeZone(
                                post.first_published || post.published,
                                "Asia/Seoul",
                                dateFormat
                              )}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="tabular-nums">
                                {formatInTimeZone(
                                  post.updated,
                                  "Asia/Seoul",
                                  dateFormat
                                )}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                초안
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
