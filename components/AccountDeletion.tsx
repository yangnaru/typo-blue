"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlainButton } from "@/components/plain-button";
import {
  sendAccountDeletionVerificationCode,
  deleteAccount,
} from "@/lib/actions/account";
import { inputClassName } from "@/lib/form-styles";
import { cn } from "@/lib/utils";
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
      if (!(await deleteAccount(challengeId, code))) {
        toast.error("인증 코드가 일치하지 않거나 만료되었습니다.");
        setStep("email_sent");
        return;
      }
      toast.success("계정이 성공적으로 삭제되었습니다.");
      router.push("/");
    } catch {
      toast.error("계정 삭제에 실패했습니다.");
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
        <h3 className="text-lg">계정 삭제</h3>
        <p className="text-neutral-500">
          계정을 삭제하면 모든 블로그, 글, 데이터가 영구적으로 삭제됩니다. 이
          작업은 되돌릴 수 없습니다.
        </p>
        <PlainButton
          variant="destructive"
          onClick={() => setIsConfirmationOpen(true)}
        >
          계정 삭제하기
        </PlainButton>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg">계정 삭제</h3>

      {step === "initial" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-red-500">이 작업은 되돌릴 수 없습니다.</p>
            <p>계정 삭제 시 다음 데이터가 모두 삭제됩니다:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>모든 블로그</li>
              <li>모든 블로그 글</li>
              <li>메일링 리스트 구독자</li>
              <li>계정 정보</li>
            </ul>
            <p className="text-neutral-500">
              계속하려면 이메일 인증을 완료해야 합니다.
            </p>
          </div>
          <div className="flex flex-row space-x-2">
            <PlainButton
              variant="destructive"
              onClick={handleInitiateDeletion}
              disabled={isLoading}
            >
              {isLoading ? "인증 코드 발송 중..." : "이메일 인증 시작"}
            </PlainButton>
            <PlainButton onClick={resetForm} disabled={isLoading}>
              취소
            </PlainButton>
          </div>
        </div>
      )}

      {step === "email_sent" && (
        <div className="space-y-4">
          <div>
            <p>이메일로 발송된 6자리 인증 코드를 입력해주세요.</p>
            <p className="text-neutral-500 text-sm">
              코드는 10분 후에 만료됩니다.
            </p>
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="123456"
            maxLength={6}
            aria-label="인증 코드"
            className={cn(inputClassName, "w-full")}
            autoComplete="one-time-code"
          />
          <div className="flex flex-row space-x-2">
            <PlainButton
              variant="destructive"
              onClick={handleVerifyAndDelete}
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? "계정 삭제 중..." : "계정 영구 삭제"}
            </PlainButton>
            <PlainButton onClick={resetForm} disabled={isLoading}>
              취소
            </PlainButton>
          </div>
        </div>
      )}

      {step === "verifying" && (
        <p className="text-neutral-500">계정을 삭제하고 있습니다...</p>
      )}
    </div>
  );
}
