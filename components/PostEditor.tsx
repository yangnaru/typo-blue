import { useEffect, useState } from "react";
import Button from "./Button";
import Tiptap from "./Tiptap";
import format from "date-fns/format";

export default function PostEditor({ blogId, existingPostId = null }: {
    blogId: string,
    existingPostId?: string | null,
}) {
    const [postId, setPostId] = useState(existingPostId);
    const [content, setContent] = useState("");
    const [title, setTitle] = useState("");
    const [status, setStatus] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [publishedAt, setPublishedAt] = useState<Date | null>(null);

    function savePost(status: "save" | "publish" = "save") {
        setIsLoading(true);

        fetch(`/api/blogs/${blogId}/posts/${postId ?? ''}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                postId: postId,
                title: title,
                content: content,
                status: status,
            })
        }).then(async res => {
            const json = await res.json();

            if (res.ok) {
                setPostId(json.postId);

                const now = new Date();
                setStatus(format(now, 'yyyy년 MM월 dd일 HH시 mm분') + ` ${status === 'save' ? '저장' : '발행'} 완료 ✅`)
                setIsLoading(false);

                if (status === 'publish' || (status === 'save' && existingPostId)) {
                    window.location.href = `/@${blogId}/${json.postId}`
                }
            } else {
                setStatus("❗️")
                setIsLoading(false);
            }
        }).catch(err => {
            setStatus("❗️")
            setIsLoading(false);
        })
    }

    function handleDelete() {
        if (confirm("정말로 삭제하시겠습니까?")) {
            fetch(`/api/blogs/${blogId}/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then(async res => {
                if (res.ok) {
                    window.location.href = `/${blogId}`
                } else {
                    setStatus("❗️")
                }
            }).catch(err => {
                setStatus("❗️")
            })
        }
    }

    useEffect(() => {
        if (existingPostId) {
            fetch(`/api/blogs/${blogId}/posts/${existingPostId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then(async res => {
                const json = await res.json();

                if (res.ok) {
                    setContent(json.content);
                    setTitle(json.title);
                    setPublishedAt(json.publishedAt ? new Date(json.publishedAt) : null);
                } else {
                    setStatus("❗️")
                }
            }).catch(err => {
                setStatus("❗️")
            })
        }
    }, [blogId, existingPostId])

    return <div className="space-y-2">
        <input type="text" className="border border-black p-2 min-w-full dark:bg-black dark:border-white rounded-sm" placeholder="제목" value={title} onChange={e => setTitle(e.target.value)} />

        {existingPostId && content &&
            <Tiptap name="content" content={content} className="p-2 prose dark:prose-invert border border-black rounded-sm dark:border-white min-h-[50vh]" onChange={(_name, html) => {
                setContent(html);
            }} />
        }
        {!existingPostId &&
            <Tiptap name="content" content={""} className="p-2 prose dark:prose-invert border border-black rounded-sm dark:border-white min-h-[50vh]" onChange={(_name, html) => {
                setContent(html);
            }} />
        }

        <div className="flex flex-row space-x-2 items-baseline">
            <Button disabled={isLoading} onClick={() => savePost("save")} content="저장" />
            {publishedAt === null && <Button disabled={isLoading} onClick={() => savePost("publish")} content="발행" />}
            {postId !== null && <button className="border border-red-500 p-1 rounded-sm hover:bg-red-300 hover:text-black" onClick={handleDelete}>삭제</button>}
            <p>{status}</p>
        </div>
    </div>
}
