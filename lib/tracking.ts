// Called from server code only; kept out of "use server" files so they
// aren't exposed as server actions that anyone could call
import { db } from "@/lib/db";
import { blog, pageViews } from "@/drizzle/schema";
import { eq, sql } from "drizzle-orm";

export async function trackPageView(
  blogId: string,
  postId: string | null,
  ipAddress: string,
  userAgent: string | null,
  referrer: string | null,
  path: string
): Promise<void> {
  try {
    await db.insert(pageViews).values({
      id: crypto.randomUUID(),
      blogId,
      postId,
      ipAddress,
      userAgent,
      referrer,
      path,
    });
  } catch (error) {
    console.error("Error tracking page view:", error);
  }
}

export async function incrementVisitorCount(blogId: string) {
  await db
    .update(blog)
    .set({
      visitor_count: sql`${blog.visitor_count} + 1`,
    })
    .where(eq(blog.id, blogId));
}
