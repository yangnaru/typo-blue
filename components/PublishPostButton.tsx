"use client";

export default function PublishPostButton({ slug, postId, publishedAt }: { slug: string, postId: string, publishedAt: Date | null }) {
    function handlePublish() {
        fetch(`/api/blogs/${slug}/posts/${postId}/publish`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: publishedAt ? "draft" : "publish" })
        }).then(async response => {
            const json = await response.json();

            if (!response.ok) {
                alert(json.error);
            } else {
                alert(json.message);

                window.location.reload();
            }
        });
    }

    return <button onClick={handlePublish} className="border rounded-sm p-1 border-red-500 hover:text-black hover:bg-red-300">
        {publishedAt ? "발행 취소" : "발행"}
    </button>
}
