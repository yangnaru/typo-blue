import CreateNewBlogForm from "@/components/CreateNewBlogForm";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { blog } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getBlogHomePath } from "@/lib/paths";

export default async function NewBlogPage() {
  const { user } = await getCurrentSession();
  if (!user) {
    return <p>로그인이 필요합니다.</p>;
  }

  // One blog per user
  const existingBlog = await db.query.blog.findFirst({
    where: eq(blog.userId, user.id),
  });
  if (existingBlog) {
    redirect(getBlogHomePath(existingBlog.slug));
  }

  return <CreateNewBlogForm />;
}
