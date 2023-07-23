"use client";

import LinkButton from "@/components/LinkButton";
import LoginStatus from "@/components/LoginStatus";
import Logo from "@/components/Logo";
import { Blog } from "@/types/Blog";
import { SessionProvider, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Home() {
  return (
    <main className="space-y-4">
      <Logo />
      <p>타이포 블루는 글로 자신을 표현하는 공간입니다.</p>

      <nav className="space-x-2 flex">
        <SessionProvider>
          <HomeWithSession />
        </SessionProvider>
      </nav>
    </main>
  )
}

function HomeWithSession() {
  const { data: session, status } = useSession();
  const [blogs, setBlogs] = useState<Blog[] | null>(null);

  useEffect(() => {
    fetch('/api/blogs', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => response.json())
      .then(data => {
        setBlogs(data.blogs);
      });
  }, []);

  return (
    <div>
      <div className="flex flex-row items-baseline space-x-2">
        {session?.user && blogs && blogs.length === 0 && <LinkButton href="/blogs/new">블로그 만들기</LinkButton>}
        <LoginStatus />
      </div>
    </div>
  )
}
