import { unsubscribeFromMailingList } from "@/lib/actions/mailing-list";
import Link from "next/link";
import Logo from "@/components/Logo";

type SearchParams = Promise<{
  token?: string;
}>;

export default async function UnsubscribePage(props: {
  searchParams: SearchParams;
}) {
  const { token } = await props.searchParams;
  const result = token ? await unsubscribeFromMailingList(token) : null;

  return (
    <div className="space-y-4">
      <Logo />
      <h3 className="text-lg">구독 해지</h3>
      {!result ? (
        <p className="text-red-500">유효하지 않은 구독해지 링크입니다.</p>
      ) : result.success ? (
        <>
          <p>{result.message}</p>
          <p className="text-neutral-500">
            더 이상 이메일 알림을 받지 않습니다.
          </p>
        </>
      ) : (
        <p className="text-red-500">{result.message}</p>
      )}
      <p>
        <Link href="/" className="text-blue-500">
          홈으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
