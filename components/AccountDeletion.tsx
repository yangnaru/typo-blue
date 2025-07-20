"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
      <div className="space-y-4 p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950 dark:border-red-800">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
          계정 삭제
        </h3>
        <p className="text-sm text-red-700 dark:text-red-300">
          계정을 삭제하면 모든 블로그, 글, 데이터가 영구적으로 삭제됩니다. 
          이 작업은 되돌릴 수 없습니다.
        </p>
        <Button 
          variant="destructive" 
          onClick={() => setIsConfirmationOpen(true)}
          className="bg-red-600 hover:bg-red-700"
        >
          계정 삭제하기
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950 dark:border-red-800">
      <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
        계정 삭제 확인
      </h3>
      
      {step === "initial" && (
        <div className="space-y-4">
          <div className="text-sm text-red-700 dark:text-red-300 space-y-2">
            <p><strong>⚠️ 경고: 이 작업은 되돌릴 수 없습니다!</strong></p>
            <p>계정 삭제 시 다음 데이터가 모두 삭제됩니다:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>모든 블로그</li>
              <li>모든 블로그 글</li>
              <li>메일링 리스트 구독자</li>
              <li>계정 정보</li>
            </ul>
            <p>계속하려면 이메일 인증을 완료해야 합니다.</p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="destructive" 
              onClick={handleInitiateDeletion}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
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
          <div className="text-sm text-red-700 dark:text-red-300">
            <p>이메일로 발송된 6자리 인증 코드를 입력해주세요.</p>
            <p className="mt-1 text-xs">코드는 10분 후에 만료됩니다.</p>
          </div>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            maxLength={6}
            className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-red-900 dark:border-red-700 dark:text-red-100"
            autoComplete="off"
          />
          <div className="flex space-x-2">
            <Button 
              variant="destructive" 
              onClick={handleVerifyAndDelete}
              disabled={isLoading || code.length !== 6}
              className="bg-red-600 hover:bg-red-700"
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
          <p className="text-red-700 dark:text-red-300">계정을 삭제하고 있습니다...</p>
        </div>
      )}
    </div>
  );
}