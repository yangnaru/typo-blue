import { cookies } from "next/headers";
import { exitImpersonation } from "@/lib/actions/admin";

export default async function MasqueradeBanner() {
  const cookieStore = await cookies();
  if (!cookieStore.get("admin_session")) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-4 bg-yellow-400 px-4 py-2 text-center text-sm text-black dark:bg-yellow-500">
      <span>다른 사용자를 흉내내는 중입니다.</span>
      <form action={exitImpersonation}>
        <button type="submit" className="font-semibold underline">
          관리자 세션으로 돌아가기
        </button>
      </form>
    </div>
  );
}
