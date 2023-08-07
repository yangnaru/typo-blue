import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function FollowersPage({ params }: { params: { blogId: string } }) {
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

    return <div>
        <h2>팔로워 {follows.length}명</h2>

        <ul>
            {follows.map((follow) => {
                return <li><Link href={follow.targetAccountId}>{follow.targetAccountId}</Link></li>
            })}
        </ul>
    </div>;
}
