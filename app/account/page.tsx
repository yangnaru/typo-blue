"use client";

import LinkButton from "@/components/LinkButton";
import { MAX_BLOGS_PER_USER } from "@/lib/const";
import { Blog } from "@/types/Blog";
import { User } from "@/types/User";
import format from "date-fns/format";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AccountHome() {
    return <SessionProvider>
        <AccountDetail />
    </SessionProvider>
}

function AccountDetail() {
    const { data: session, status } = useSession();
    const [blogs, setBlogs] = useState<Blog[] | null>(null);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        fetch('/api/blogs', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(
            response => response.json()
        ).then(data => {
            setBlogs(data.blogs);
            setUser(data.user);
        });
    }, []);

    return <div>
        {session?.user?.email
            ? <div className="space-y-8 mt-6">
                {user && <div className="space-y-4">
                    <h3 className="text-lg">계정 정보</h3>
                    <div className="flex flex-row place-content-between justify-self-auto items-center">
                        <div>
                            <p>이메일 주소: {user.email}</p>
                            <p>가입일: {format(new Date(user.createdAt), 'yyyy년 M월 d일')}</p>
                        </div>
                        <button className="border border-red-500 rounded-sm p-1" onClick={() => { if (confirm('정말 로그아웃 하시겠습니까?')) signOut() }}>로그아웃</button>
                    </div>
                </div>}

                <div className="space-y-4">
                    <h3 className="text-lg">개설된 블로그</h3>
                    <div className="space-y-4">
                        {blogs?.length !== 0
                            ? blogs?.map(blog => <BlogInfo key={blog.slug} blog={blog} />)
                            : <p>개설된 블로그가 없습니다.</p>
                        }
                        <div>
                            {(blogs && blogs.length >= MAX_BLOGS_PER_USER)
                                ? <p>최대 개설 가능한 블로그 수에 도달했습니다.</p>
                                : <LinkButton href="/blogs/new" className="p-2">새 블로그 만들기</LinkButton>}
                        </div>
                    </div>
                </div>
            </div>
            : <p>로그인이 필요합니다.</p>
        }
    </div>
}

function BlogInfo({ blog }: { blog: Blog }) {
    function handleDeleteBlog() {
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
            }).then(
                response => response.json()
            ).then(data => {
                if (data.status === 'success') {
                    alert('블로그가 삭제되었습니다.');
                    window.location.href = '/account';
                } else {
                    alert('블로그 삭제에 실패했습니다.');
                }
            });
        }
    }

    return <div className="border rounded-sm p-2 space-y-2 flex flex-row place-content-between items-center">
        <div className="space-y-1">
            <p className="font-semibold underline">
                <Link href={`/@${blog.slug}`}>
                    @{blog.slug} {blog.name && `(${blog.name})`}
                </Link>
            </p>
            <p>개설일: {format(new Date(blog.createdAt), 'yyyy년 M월 d일')}</p>
            <p>글 수: {blog.postCount}</p>
        </div>
        <div className="flex flex-col space-y-2 items-end">
            <LinkButton href={`/@${blog.slug}/edit`} className="w-24 text-center">정보 수정</LinkButton>
            <button className="border border-red-500 rounded-sm p-1 hover:bg-red-300 hover:text-black w-24" onClick={handleDeleteBlog}>블로그 삭제</button>
        </div>
    </div>
}
