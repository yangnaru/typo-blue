import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h2>존재하지 않는 페이지입니다 👀</h2>
      <Link href="/">홈으로 돌아가기</Link>
    </div>
  );
}
