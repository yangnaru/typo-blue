import { connection } from "next/server";
import { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import PostList from "@/components/PostList";
import { PlainButton } from "@/components/plain-button";
import {
  inputClassName,
  linkButtonClassName,
  submitClassName,
} from "@/lib/form-styles";
import type { Post } from "@/lib/db";

export const metadata: Metadata = {
  title: "디자인",
  description: "타이포 블루의 디자인 시스템",
};

const colors = [
  { name: "본문", className: "bg-black dark:bg-white", token: "기본 글자색" },
  { name: "보조", className: "bg-neutral-500", token: "text-neutral-500" },
  { name: "링크", className: "bg-blue-500", token: "text-blue-500" },
  { name: "강조", className: "bg-blue-300", token: "hover:bg-blue-300" },
  { name: "위험", className: "bg-red-500", token: "text-red-500" },
];

const samplePosts = [
  {
    id: "00000000-0000-0000-0000-000000000002",
    title: "두 번째 글",
    published: new Date("2026-09-24T05:45:00Z"),
    first_published: new Date("2026-09-24T05:45:00Z"),
    updated: new Date("2026-09-24T05:45:00Z"),
  },
  {
    id: "00000000-0000-0000-0000-000000000001",
    title: "첫 번째 글",
    published: new Date("2026-09-23T05:45:00Z"),
    first_published: new Date("2026-09-23T05:45:00Z"),
    updated: new Date("2026-09-23T05:45:00Z"),
  },
] as Post[];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h3 className="text-lg">{title}</h3>
      {children}
    </section>
  );
}

function Token({ children }: { children: React.ReactNode }) {
  return <code className="text-neutral-500 text-sm">{children}</code>;
}

export default async function DesignPage() {
  await connection();

  return (
    <div className="space-y-12 pb-8">
      <Logo />

      <div className="space-y-2">
        <h2 className="text-2xl font-bold">디자인</h2>
        <p>
          타이포 블루는 글이 먼저 보이도록 만듭니다. 이 페이지는 서비스 전체에서
          쓰는 글자, 색, 링크, 버튼, 입력란을 실제 구성 요소로 보여 줍니다.
        </p>
      </div>

      <Section title="원칙">
        <ul className="list-disc list-inside space-y-1">
          <li>하나의 좁은 단(max-w-prose)에 모든 내용을 담습니다.</li>
          <li>카드, 배지, 그림자, 아이콘 대신 글과 여백으로 구분합니다.</li>
          <li>이동은 파란 글자 링크로, 동작은 파란 테두리 버튼으로 합니다.</li>
          <li>머리글의 계정·테마 메뉴는 예외로 파란 테두리 버튼을 씁니다.</li>
          <li>부가 정보는 회색으로 한 줄에 모아 · 로 나눕니다.</li>
          <li>날짜는 굵은 고정폭 숫자로 목록 맨 앞에 둡니다.</li>
        </ul>
      </Section>

      <Section title="글자">
        <div className="space-y-3">
          <div>
            <p className="text-2xl font-bold">블로그 이름</p>
            <Token>text-2xl font-bold</Token>
          </div>
          <div>
            <p className="text-xl">페이지 제목</p>
            <Token>text-xl</Token>
          </div>
          <div>
            <p className="text-lg">구역 제목</p>
            <Token>text-lg</Token>
          </div>
          <div>
            <p className="font-bold">소제목</p>
            <Token>font-bold</Token>
          </div>
          <div>
            <p>본문 글자입니다. 한국어 문장은 단어 단위로 줄을 바꿉니다.</p>
            <Token>기본 · break-keep</Token>
          </div>
          <div>
            <p className="text-neutral-500 text-sm">
              부가 정보 · 2026-09-24 · 3분
            </p>
            <Token>text-neutral-500 text-sm</Token>
          </div>
        </div>
        <p className="text-neutral-500">
          글꼴은 Inter와 시스템 한글 글꼴을 씁니다.
        </p>
      </Section>

      <Section title="색">
        <ul className="space-y-2">
          {colors.map((color) => (
            <li key={color.name} className="flex flex-row items-center gap-3">
              <span
                className={`inline-block h-5 w-5 rounded-sm ${color.className}`}
                aria-hidden="true"
              />
              {color.name} <Token>{color.token}</Token>
            </li>
          ))}
        </ul>
        <p className="text-neutral-500">
          배경은 밝은 테마에서 흰색, 어두운 테마에서 검은색입니다.
        </p>
      </Section>

      <Section title="로고">
        <p className="text-xl font-extrabold">
          typo <span className="text-blue-500">blue</span>
        </p>
        <Token>text-xl font-extrabold · blue는 text-blue-500</Token>
      </Section>

      <Section title="링크">
        <div className="flex flex-row flex-wrap gap-x-3 gap-y-1">
          <Link href="/design" className="text-blue-500">
            일반 링크
          </Link>
          <span className="font-bold">현재 페이지</span>
          <Link href="/design" className="text-neutral-500">
            보조 링크
          </Link>
          <button type="button" className={linkButtonClassName}>
            글자 버튼
          </button>
          <button type="button" className={linkButtonClassName} disabled>
            비활성 글자 버튼
          </button>
        </div>
        <Token>text-blue-500 · font-bold · text-neutral-500</Token>
      </Section>

      <Section title="버튼">
        <div className="flex flex-row flex-wrap gap-2">
          <PlainButton>저장</PlainButton>
          <PlainButton variant="destructive">삭제</PlainButton>
          <PlainButton disabled>비활성</PlainButton>
          <PlainButton asChild>
            <Link href="/design">링크 버튼</Link>
          </PlainButton>
        </div>
        <Token>
          PlainButton · border-blue-500 rounded-sm hover:bg-blue-300
        </Token>
      </Section>

      <Section title="입력란">
        <form className="flex flex-col space-y-2">
          <input
            type="text"
            aria-label="예시 입력란"
            placeholder="입력란"
            className={inputClassName}
          />
          <textarea
            aria-label="예시 여러 줄 입력란"
            placeholder="여러 줄 입력란"
            rows={2}
            className={inputClassName}
          />
          <label className="flex flex-row items-center gap-2">
            <input type="checkbox" defaultChecked />
            체크박스
          </label>
          <input
            type="button"
            className={submitClassName}
            value="폼 제출 버튼"
          />
        </form>
        <Token>inputClassName · submitClassName</Token>
      </Section>

      <Section title="글 목록">
        <PostList
          name="글 목록"
          blog={{ slug: "design" }}
          posts={samplePosts}
          showTitle={false}
        />
        <Token>PostList · 굵은 날짜 + 제목</Token>
      </Section>

      <Section title="본문">
        <div className="prose dark:prose-invert break-keep">
          <h2>소제목</h2>
          <p>
            글 본문은 Tailwind Typography로 꾸밉니다. <strong>굵게</strong>,{" "}
            <em>기울임</em>, <Link href="/design">링크</Link>를 쓸 수 있습니다.
          </p>
          <ul>
            <li>목록 하나</li>
            <li>목록 둘</li>
          </ul>
          <blockquote>
            <p>인용문입니다.</p>
          </blockquote>
          <pre>
            <code>const typo = &quot;blue&quot;;</code>
          </pre>
        </div>
        <Token>prose dark:prose-invert break-keep</Token>
      </Section>

      <Section title="바닥글">
        <div>
          <hr className="bg-neutral-500" />
          <div className="flex flex-row items-center justify-between text-sm font-semibold">
            <span>
              <span className="text-neutral-500">powered by</span> typo{" "}
              <span className="text-blue-500">blue</span>
            </span>
            <span className="text-neutral-500">total 42</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
