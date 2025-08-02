"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  sendAccountDeletionVerificationCode, 
  deleteAccount 
} from "@/lib/actions/account";
import { useRouter } from "next/navigation";

export default function AccountDeletion() {
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"initial" | "email_sent" | "verifying">("initial");
  const router = useRouter();

  const handleInitiateDeletion = async () => {
    setIsLoading(true);
    try {
      const id = await sendAccountDeletionVerificationCode();
      setChallengeId(id);
      setStep("email_sent");
      toast.success("계정 삭제 인증 코드를 이메일로 보냈습니다.");
    } catch (error) {
      toast.error("인증 코드 발송에 실패했습니다.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndDelete = async () => {
    if (!challengeId || !code) {
      toast.error("인증 코드를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setStep("verifying");
    
    try {
      await deleteAccount(challengeId, code);
      toast.success("계정이 성공적으로 삭제되었습니다.");
      router.push("/");
    } catch (error: any) {
      toast.error(error.message || "계정 삭제에 실패했습니다.");
      setStep("email_sent");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setIsConfirmationOpen(false);
    setChallengeId(null);
    setCode("");
    setStep("initial");
  };

  if (!isConfirmationOpen) {
    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-destructive mb-2">계정 삭제</h4>
          <p className="text-sm text-muted-foreground mb-4">
            계정을 삭제하면 모든 블로그, 글, 데이터가 영구적으로 삭제됩니다. 
            이 작업은 되돌릴 수 없습니다.
          </p>
        </div>
        <Button 
          variant="destructive" 
          onClick={() => setIsConfirmationOpen(true)}
        >
          계정 삭제하기
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 border border-destructive/20 rounded-lg bg-destructive/5">
      <div>
        <h4 className="font-semibold text-destructive mb-2">계정 삭제 확인</h4>
      </div>
      
      {step === "initial" && (
        <div className="space-y-4">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <svg className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium text-destructive">경고: 이 작업은 되돌릴 수 없습니다!</p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-2">계정 삭제 시 다음 데이터가 모두 삭제됩니다:</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                <li>모든 블로그</li>
                <li>모든 블로그 글</li>
                <li>메일링 리스트 구독자</li>
                <li>계정 정보</li>
              </ul>
            </div>
            <p className="text-muted-foreground">계속하려면 이메일 인증을 완료해야 합니다.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="destructive" 
              onClick={handleInitiateDeletion}
              disabled={isLoading}
            >
              {isLoading ? "인증 코드 발송 중..." : "이메일 인증 시작"}
            </Button>
            <Button 
              variant="outline" 
              onClick={resetForm}
              disabled={isLoading}
            >
              취소
            </Button>
          </div>
        </div>
      )}

      {step === "email_sent" && (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>이메일로 발송된 6자리 인증 코드를 입력해주세요.</p>
            <p className="mt-1 text-xs">코드는 10분 후에 만료됩니다.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="verification-code">인증 코드</Label>
            <Input
              id="verification-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              autoComplete="off"
              className="font-mono text-center tracking-wider"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="destructive" 
              onClick={handleVerifyAndDelete}
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? "계정 삭제 중..." : "계정 영구 삭제"}
            </Button>
            <Button 
              variant="outline" 
              onClick={resetForm}
              disabled={isLoading}
            >
              취소
            </Button>
          </div>
        </div>
      )}

      {step === "verifying" && (
        <div className="text-center py-4">
          <p className="text-muted-foreground">계정을 삭제하고 있습니다...</p>
        </div>
      )}
    </div>
  );
}