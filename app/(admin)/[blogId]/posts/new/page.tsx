import PostEditor from "@/components/PostEditor";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRootPath } from "@/lib/paths";
import { redirect } from "next/navigation";

export default async function BlogNewPostPage(
  props: {
    params: Promise<{ blogId: string }>;
  }
) {
  const params = await props.params;
  const { user } = await validateRequest();

  const blogId = decodeURIComponent(params.blogId).replace("@", "");
  const blog = await prisma.blog.findUnique({
    where: {
      slug: blogId,
    },
  });

  if (user?.id !== blog?.userId) {
    redirect(getRootPath());
  }

  return <PostEditor blogId={blogId} />;
}
