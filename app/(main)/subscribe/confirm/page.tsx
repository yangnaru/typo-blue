import { confirmSubscription } from "@/lib/actions/mailing-list";
import Link from "next/link";
import Logo from "@/components/Logo";
import SubscriptionTokenForm from "@/components/SubscriptionTokenForm";
import { db } from "@/lib/db";
import { mailingListSubscription } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

type SearchParams = Promise<{
  token?: string;
}>;

export default async function ConfirmSubscriptionPage(props: {
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
      <h3 className="text-lg">구독 확인</h3>
      {!token || !subscription ? (
        <p className="text-red-500">
          유효하지 않거나 만료된 링크입니다.
        </p>
      ) : (
        <>
          <p>
            {subscription.email}의{" "}
            <strong>
              {subscription.blog.name || `@${subscription.blog.slug}`}
            </strong>{" "}
            구독을 확인할까요?
          </p>
          <SubscriptionTokenForm
            token={token}
            action={confirmSubscription}
            label="구독 확인"
            doneDescription="새 글이 올라오면 이메일로 알려 드립니다."
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
