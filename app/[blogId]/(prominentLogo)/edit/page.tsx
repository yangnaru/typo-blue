"use client"

import BlogSlugInput from "@/components/BlogSlugInput";
import { useEffect, useState } from "react";

interface Blog {
    slug: string | null;
    name: string | null;
    description: string | null;
    postCount: number | null;
}

export default function EditBlogPage({ params }: { params: { blogId: string } }) {
    const [blog, setBlog] = useState<Blog>({
        slug: null,
        name: null,
        description: null,
        postCount: null,
    });

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        setBlog({
            ...blog,
            [event.target.name]: event.target.value
        })
    }

    function handleSubmit(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        e.preventDefault();
        
        fetch(`/api/blogs/${params.blogId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(blog)
        }).then(async response => {
            const json = await response.json();

            if (!response.ok) {
                alert(json.error)
            } else {
                alert(json.message)

                window.location.href = `/@${json.slug}`
            }
        })
    }

    function handleDelete() {
        let confirmDelete;
        if (blog.postCount !== 0) {
            confirmDelete = prompt(`정말 블로그 "${blog.slug}"를 삭제하시겠습니까?\n\n삭제하시려면 "${blog.slug}" 라고 입력해 주세요.`) === blog.slug;
        } else {
            confirmDelete = true;
        }

        if (confirmDelete) {
            fetch(`/api/blogs/${blog.slug}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        alert('블로그가 삭제되었습니다.');
                        window.location.href = '/account';
                    } else {
                        alert('블로그 삭제에 실패했습니다.');
                    }
                });
        }
    }

    useEffect(() => {
        fetch(`/api/blogs/${params.blogId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(
            response => response.json()
        ).then(data => {
            setBlog({
                slug: data.slug,
                name: data.name,
                description: data.description,
                postCount: data.postCount,
            });
        });
    }, [params.blogId]);

    return <div className="space-y-4">
        <h3 className="text-lg">블로그 정보 수정</h3>
        {blog && <form className="flex flex-col space-y-4 items-start">
            <div className="flex flex-col">
                <label htmlFor="slug">블로그 주소</label>
                {(blog.slug || blog.slug === '') && <BlogSlugInput value={blog.slug} handleChange={e => handleChange(e)} className="p-2 dark:text-white dark:bg-black border dark:border-white border-black rounded-sm" />}
            </div>
            <div className="flex flex-col">
                <label htmlFor="name">블로그 제목</label>
                <input type="text" placeholder="블로그 제목을 적어 주세요." className="p-2 dark:text-white dark:bg-black border dark:border-white border-black rounded-sm" onChange={handleChange} name="name" value={blog.name ?? ''} />
            </div>
            <div className="flex flex-col">
                <label htmlFor="description">블로그 설명</label>
                <input type="text" placeholder="블로그 설명을 적어 주세요." className="p-2 dark:text-white dark:bg-black border dark:border-white border-black rounded-sm" onChange={handleChange} name="description" value={blog.description ?? ''} />
            </div>
            <button className="p-2 border rounded-sm" type="submit" onClick={(e) => handleSubmit(e)}>저장</button>
            <button className="p-2 border rounded-sm border-red-500 hover:bg-red-300 hover:text-black" onClick={handleDelete}>블로그 삭제</button>
        </form>
        }
    </div>
}
