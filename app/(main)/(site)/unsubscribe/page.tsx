import { unsubscribeFromMailingList } from "@/lib/actions/mailing-list";
import Link from "next/link";
import Logo from "@/components/Logo";
import SubscriptionTokenForm from "@/components/SubscriptionTokenForm";
import { db } from "@/lib/db";
import { mailingListSubscription } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

type SearchParams = Promise<{
  token?: string;
}>;

export default async function UnsubscribePage(props: {
  searchParams: SearchParams;
}) {
  const { token } = await props.searchParams;
  const subscription = token
    ? await db.query.mailingListSubscription.findFirst({
        where: eq(mailingListSubscription.unsubscribeToken, token),
        with: { blog: true },
      })
    : null;

  return (
    <div className="space-y-4">
      <Logo />
      <h3 className="text-lg">구독 해지</h3>
      {!token || !subscription ? (
        <p className="text-red-500">
          유효하지 않거나 이미 해지된 구독해지 링크입니다.
        </p>
      ) : (
        <>
          <p>
            {subscription.email}의{" "}
            <strong>
              {subscription.blog.name || `@${subscription.blog.slug}`}
            </strong>{" "}
            구독을 해지할까요?
          </p>
          <SubscriptionTokenForm
            token={token}
            action={unsubscribeFromMailingList}
            label="구독 해지"
            doneDescription="더 이상 이메일 알림을 받지 않습니다."
          />
        </>
      )}
      <p>
        <Link href="/" className="text-blue-500">
          홈으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
