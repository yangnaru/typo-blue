"use client";

import PostEditor from "@/components/PostEditor";

export default function EditPost({ params }: { params: { blogId: string, postId: string } }) {
    const blogId = decodeURIComponent(params.blogId).replace('@', '');

    return <div className="space-y-2">
        <h2 className="text-xl">글 수정</h2>

        <PostEditor blogId={blogId} existingPostId={params.postId} />
    </div>
}
