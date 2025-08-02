import { getCurrentSession } from "@/lib/auth";
import SetPasswordForm from "./form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getAccountPath } from "@/lib/paths";

export default async function SetPasswordPage() {
  const { user } = await getCurrentSession();

  if (!user) {
    return <p>로그인이 필요합니다.</p>;
  }

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <div className="space-y-6">
        <div>
          <Button asChild variant="ghost" className="mb-4 -ml-4">
            <Link href={getAccountPath()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              계정 설정으로 돌아가기
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">비밀번호 설정</h1>
          <p className="text-muted-foreground">
            계정 보안을 위해 강력한 비밀번호를 설정해주세요.
          </p>
        </div>

        <SetPasswordForm email={user.email} />
      </div>
    </div>
  );
}
