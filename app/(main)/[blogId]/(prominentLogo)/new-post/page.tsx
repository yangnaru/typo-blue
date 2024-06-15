"use client";

import PostEditor from "@/components/PostEditor";

export default function BlogNewPostPage({ params }: { params: { blogId: string } }) {
    const blogId = decodeURIComponent(params.blogId).replace('@', '');
    
    return <div className="space-y-2">
        <h2 className="text-xl">새 글 쓰기</h2>

        <PostEditor blogId={blogId} />
    </div>
}
