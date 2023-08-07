import { prisma } from "@/lib/db";

export default async function FollowersPage({ params }: { params: { blogId: string }}) {
    const blogSlug = decodeURIComponent(params.blogId).replace('@', '')
    const blog = await prisma.blog.findUnique({
        where: {
            slug: blogSlug,
        },
    })

    if (!blog) {
        return <p>블로그가 존재하지 않습니다.</p>
    }

    const follows = await prisma.follow.findMany({
        where: {
            accountId: blog.id,
        },
    })
    console.log(follows);

    return <div>
        <h2>Followers</h2>

        {follows.map((follow) => {
            return <p>{follow.targetAccountId}</p>
        })
        }
    </div>;
}
