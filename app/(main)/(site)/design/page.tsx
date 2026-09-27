import { connection } from "next/server";
import { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import PostList from "@/components/PostList";
import { DayHeading } from "@/components/day-heading";
import { PlainButton } from "@/components/plain-button";
import { Pill, PillItem } from "@/components/pill";
import {
  inputClassName,
  linkButtonClassName,
  submitClassName,
} from "@/lib/form-styles";
import type { Post } from "@/lib/db";
import { formatSeoulDate, groupBySeoulDay } from "@/lib/dates";

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

const HOUR = 60 * 60 * 1000;

// Times before now, so 오늘 and 어제 show as they would on a real list.
function sampleRecentPosts(now: Date) {
  return [
    {
      id: "recent-1",
      title: "두 번째 책을 마치며: 편집자와 주고받은 스무 통의 편지",
      blog: "문장수집가",
      preview: "원고를 넘긴 지 정확히 일주일이 지났다. ...",
      date: new Date(now.getTime() - HOUR),
    },
    {
      id: "recent-2",
      title: "",
      blog: "@jh",
      preview: "고양이가 키보드 위에서 잠들었다.",
      date: new Date(now.getTime() - 2 * HOUR),
    },
    {
      id: "recent-3",
      title: "PostgreSQL 인덱스가 생각대로 쓰이지 않을 때",
      blog: "데이터베이스 노트",
      preview: "EXPLAIN ANALYZE 결과를 읽는 법부터 시작하자. ...",
      date: new Date(now.getTime() - 26 * HOUR),
    },
  ];
}

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

  const now = new Date();
  const sampleDates = [
    { date: now, note: "오늘" },
    { date: new Date(now.getTime() - 24 * HOUR), note: "어제" },
    { date: new Date("2026-09-24T05:05:00Z"), note: "올해" },
    { date: new Date("2024-03-14T05:05:00Z"), note: "지난해 이전" },
  ];

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
          <li>관련된 버튼과 메뉴는 하나의 버튼 묶음으로 붙여 둡니다.</li>
          <li>부가 정보는 회색으로 한 줄에 모아 · 로 나눕니다.</li>
          <li>목록의 줄은 제목으로 시작하고, 부가 정보는 그 아래 줄에 둡니다.</li>
          <li>
            날짜는 오늘, 어제, 9월 24일처럼 말로 쓰고, 같은 날의 항목이 많으면
            날짜 머리글 아래 모읍니다.
          </li>
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
              부가 정보 · 9월 24일 · 3분
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

      <Section title="버튼 묶음">
        <div className="space-y-3">
          <Pill aria-label="예시 메뉴">
            <PillItem active asChild>
              <Link href="/design" aria-current="page">
                현재 메뉴
              </Link>
            </PillItem>
            <PillItem asChild>
              <Link href="/design">다른 메뉴</Link>
            </PillItem>
            <PillItem asChild>
              <Link href="/design">또 다른 메뉴</Link>
            </PillItem>
          </Pill>
          <div>
            <Pill aria-label="예시 작업">
              <PillItem>저장</PillItem>
              <PillItem>발행</PillItem>
              <PillItem disabled>비활성</PillItem>
            </Pill>
          </div>
        </div>
        <p className="text-neutral-500">
          메뉴, 머리글, 글 작업, 달력, 정렬처럼 함께 쓰는 버튼을 묶습니다. 선택된
          칸은 파랗게 채우고, 길어지면 줄을 바꾸지 않고 옆으로 넘깁니다.
        </p>
        <Token>Pill · PillItem active · asChild</Token>
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

      <Section title="날짜">
        <ul className="space-y-2">
          {sampleDates.map(({ date, note }) => (
            <li key={note} className="space-y-0.5">
              <p className="tabular-nums">
                {formatSeoulDate(date, { relative: true, time: true })}
                <span className="text-neutral-500">
                  {" · "}
                  {formatSeoulDate(date, { weekday: true })}
                </span>
              </p>
              <p className="text-neutral-500 text-sm">{note}</p>
            </li>
          ))}
        </ul>
        <p className="text-neutral-500">
          날짜는 서울 기준으로 셉니다. 올해가 아니면 연도를 붙이고, 요일은
          머리글과 글 페이지에만, 시각은 글 페이지, 내 글 목록, 알림처럼 필요한
          곳에만 붙입니다. 오늘과 어제는 목록에만 쓰고, 주소가 남는 글
          페이지에는 쓰지 않습니다.
        </p>
        <Token>formatSeoulDate · relative · weekday · time</Token>
      </Section>

      <Section title="날짜별 목록">
        <div className="space-y-4">
          {groupBySeoulDay(sampleRecentPosts(now), (post) => post.date).map(
            ({ day, date, items }) => (
              <section key={day} className="space-y-3">
                <DayHeading date={date} />
                <ul className="space-y-3">
                  {items.map((post) => (
                    <li key={post.id} className="break-keep">
                      <Link href="/design" className="font-semibold">
                        {post.title || "무제"}
                      </Link>
                      <p className="text-neutral-500 text-xs truncate">
                        {post.blog}
                      </p>
                      <p className="text-neutral-500 text-sm line-clamp-2">
                        {post.preview}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )
          )}
        </div>
        <p className="text-neutral-500">
          하루에 여러 항목이 쌓이는 목록에 씁니다. 머리글이 날짜를 말하므로 각
          줄은 제목으로 시작하고, 블로그 이름처럼 길어질 수 있는 부가 정보는 한
          줄에서 잘라 냅니다. 대부분 하루에 하나뿐인 목록이라면 머리글 대신
          날짜를 부가 정보 줄에 둡니다.
        </p>
        <Token>groupBySeoulDay · DayHeading</Token>
      </Section>

      <Section title="글 목록">
        <PostList
          name="글 목록"
          blog={{ slug: "design" }}
          posts={samplePosts}
          showTitle={false}
        />
        <Token>PostList · 굵은 날짜 + 제목 (날짜 표기를 옮기기 전의 방식)</Token>
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
