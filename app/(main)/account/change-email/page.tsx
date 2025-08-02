"use client";

import {
  sendEmailVerificationCodeForEmailChange,
  verifyEmailVerificationCodeAndChangeAccountEmail,
} from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getAccountPath } from "@/lib/paths";

export default function ChangeEmailPage() {
  const [email, setEmail] = useState("");
  const [emailInputDisabled, setEmailInputDisabled] = useState(false);
  const [buttonText, setButtonText] = useState("이메일 변경 코드 보내기");
  const [buttonDisabled, setButtonDisabled] = useState(false);

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email) {
      toast("이메일 주소를 입력해주세요.");
      return;
    }

    if (challengeId === null) {
      setButtonDisabled(true);
      setButtonText("이메일 변경 코드 보내는 중...");

      try {
        const challengeId = await sendEmailVerificationCodeForEmailChange(
          email
        );
        toast("이메일 변경 코드를 보냈습니다. 이메일을 확인해 주세요.");
        setEmailInputDisabled(true);
        setButtonText("이메일 변경 코드 인증");
        setButtonDisabled(false);
        setChallengeId(challengeId);
      } catch (e) {
        toast("이메일 변경에 실패했습니다. 다시 시도해주세요.");
        setButtonDisabled(false);
        setButtonText("이메일 변경 코드 보내기");
      }
    }

    if (challengeId) {
      verifyEmailVerificationCodeAndChangeAccountEmail(challengeId, code).then(
        (verified) => {
          if (verified) {
            toast("이메일 변경에 성공했습니다.");

            return;
          } else {
            toast("이메일 변경에 실패했습니다. 다시 시도해주세요.");
          }
        }
      );
    }
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
          <h1 className="text-3xl font-bold tracking-tight">이메일 변경</h1>
          <p className="text-muted-foreground">
            새로운 이메일 주소로 변경하려면 인증이 필요합니다.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>이메일 주소 변경</CardTitle>
            <CardDescription>
              {challengeId
                ? "새 이메일 주소로 전송된 인증 코드를 입력해주세요."
                : "변경하고자 하는 새 이메일 주소를 입력해주세요."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">새 이메일 주소</Label>
                <Input
                  type="email"
                  id="email"
                  autoComplete="email"
                  placeholder="새로운 이메일 주소를 입력해주세요"
                  disabled={emailInputDisabled}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              {challengeId && (
                <div className="space-y-2">
                  <Label htmlFor="code">인증 코드</Label>
                  <Input
                    type="text"
                    id="code"
                    maxLength={6}
                    autoComplete="off"
                    placeholder="6자리 인증 코드를 입력해주세요"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    이메일로 전송된 6자리 인증 코드를 입력해주세요.
                  </p>
                </div>
              )}
              
              <Button
                type="submit"
                disabled={buttonDisabled}
                className="w-full"
              >
                {buttonText}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
