"use client";

import { useState } from "react";
import { PlainButton } from "@/components/plain-button";
import { inputClassName } from "@/lib/form-styles";
import { subscribeToMailingList } from "@/lib/actions/mailing-list";
import { toast } from "sonner";

interface MailingListSubscriptionProps {
  blogId: string;
  blogName: string;
}

export default function MailingListSubscription({ 
  blogId, 
  blogName 
}: MailingListSubscriptionProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("이메일을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await subscribeToMailingList(email, blogId);
      
      if (result.success) {
        toast.success(result.message);
        setEmail("");
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("구독 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-normal font-bold">메일링 리스트 구독</h3>
      <p className="text-neutral-500">
        {blogName}에 새 글이 올라오면 이메일로 받아볼 수 있습니다.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-row gap-2">
        <input
          type="email"
          aria-label="이메일 주소"
          placeholder="이메일 주소"
          className={`${inputClassName} flex-1 min-w-0`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
        <PlainButton type="submit" disabled={isLoading}>
          {isLoading ? "구독 중..." : "구독"}
        </PlainButton>
      </form>
    </div>
  );
}
