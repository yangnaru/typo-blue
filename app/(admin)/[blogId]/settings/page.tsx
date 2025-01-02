import BlogEditForm from "@/components/BlogEditForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function EditBlogPage(
  props: {
    params: Promise<{ blogId: string }>;
  }
) {
  const params = await props.params;
  const { user } = await validateRequest();
  if (!user) {
    return <p>로그인이 필요합니다.</p>;
  }

  const blogSlug = decodeURIComponent(params.blogId).replace("@", "");
  const blog = await prisma.blog.findUnique({
    where: {
      slug: blogSlug,
      userId: user.id,
    },
    include: {
      _count: {
        select: {
          posts: true,
        },
      },
    },
  });

  if (!blog) {
    return <p>블로그를 찾을 수 없습니다.</p>;
  }

  return (
    <BlogEditForm
      slug={blog.slug}
      name={blog.name ?? ""}
      description={blog.description ?? ""}
      discoverable={blog.discoverable}
      postCount={blog._count.posts}
    />
  );
}
