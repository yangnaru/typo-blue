import { unsubscribeFromMailingList } from "@/lib/actions/mailing-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type SearchParams = Promise<{
  token?: string;
}>;

export default async function UnsubscribePage(props: {
  searchParams: SearchParams;
}) {
  const { token } = await props.searchParams;

  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 border rounded-lg">
        <h1 className="text-2xl font-bold mb-4">구독 해지</h1>
        <p className="text-muted-foreground mb-4">
          유효하지 않은 구독해지 링크입니다.
        </p>
        <Button asChild>
          <Link href="/">홈으로 돌아가기</Link>
        </Button>
      </div>
    );
  }

  const result = await unsubscribeFromMailingList(token);

  return (
    <div className="max-w-md mx-auto mt-8 p-6 border rounded-lg">
      <h1 className="text-2xl font-bold mb-4">구독 해지</h1>
      
      {result.success ? (
        <div className="space-y-4">
          <p className="text-green-600">{result.message}</p>
          <p className="text-sm text-muted-foreground">
            더 이상 이메일 알림을 받지 않습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-red-600">{result.message}</p>
        </div>
      )}
      
      <Button asChild className="mt-4">
        <Link href="/">홈으로 돌아가기</Link>
      </Button>
    </div>
  );
}