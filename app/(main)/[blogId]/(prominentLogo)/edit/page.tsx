import BlogEditForm from "@/components/BlogEditForm";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function EditBlogPage({
  params,
}: {
  params: { blogId: string };
}) {
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
    <div className="space-y-4">
      <h3 className="text-lg">블로그 정보 수정</h3>
      <BlogEditForm
        slug={blog.slug}
        name={blog.name ?? ""}
        description={blog.description ?? ""}
        discoverable={blog.discoverable}
        postCount={blog._count.posts}
      />
    </div>
  );
}
