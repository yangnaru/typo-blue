import { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import { SELF_DESCRIPTION } from "@/lib/const";
import { getLoginPath } from "@/lib/paths";

export const metadata: Metadata = {
  title: "소개",
  description: `${SELF_DESCRIPTION}.`,
};

export default function AboutPage() {
  return (
    <div className="space-y-4">
      <Logo />

      <h2 className="text-xl">소개</h2>

      <p>{SELF_DESCRIPTION}</p>

      <ul className="list-disc list-inside">
        <li>텍스트와 이미지 등을 포함한 게시물을 쓸 수 있습니다.</li>
        <li>독자들이 이메일로 새 글을 구독할 수 있습니다.</li>
        <li>연합우주로 글을 발행할 수 있습니다.</li>
      </ul>

      <p>
        지금{" "}
        <Link href={getLoginPath()} className="text-blue-500">
          이메일로 가입
        </Link>
        하고 블로그를 만들어 보세요.
      </p>
    </div>
  );
}
