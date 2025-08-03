import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { desc, eq, isNull, isNotNull, and } from "drizzle-orm";
import { blog, postTable } from "@/drizzle/schema";
import { BlogCalendar } from "@/components/blog-calendar";
import { getRootPath } from "@/lib/paths";

type PageProps = Promise<{
  blogId: string;
}>;

export default async function CalendarPage(props: { params: PageProps }) {
  const { blogId } = await props.params;

  const { user: sessionUser } = await getCurrentSession();

  const decodedBlogId = decodeURIComponent(blogId);
  const slug = decodedBlogId.replace("@", "");
  const currentBlog = await db.query.blog.findFirst({
    where: eq(blog.slug, slug),
  });

  if (!currentBlog) {
    redirect(getRootPath());
  }

  if (!sessionUser || sessionUser.id !== currentBlog?.userId) {
    redirect(getRootPath());
  }

  // Optimized query: Only fetch published posts with first_published dates for calendar
  const posts = await db.query.postTable.findMany({
    where: and(
      eq(postTable.blogId, currentBlog.id),
      isNull(postTable.deleted),
      isNotNull(postTable.published),
      isNotNull(postTable.first_published)
    ),
    orderBy: [desc(postTable.first_published)],
    columns: {
      id: true,
      title: true,
      published: true,
      first_published: true,
    },
  });

  // Transform posts to match the component interface
  const transformedPosts = posts.map(post => ({
    id: post.id,
    title: post.title,
    published: post.published ? new Date(post.published) : null,
    first_published: post.first_published ? new Date(post.first_published) : null,
    blogId: currentBlog.id,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">발행 캘린더</h1>
        <p className="text-muted-foreground">
          발행된 글의 일정을 달력으로 확인하세요.
        </p>
      </div>
      
      <BlogCalendar posts={transformedPosts} blogSlug={slug} />
    </div>
  );
}