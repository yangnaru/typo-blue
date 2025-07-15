"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    } catch (error) {
      toast.error("구독 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-6 bg-muted/50">
      <h3 className="text-lg font-semibold mb-2">메일링 리스트 구독</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {blogName}에 새로운 글이 게시되면 이메일로 알림을 받아보세요.
      </p>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder="이메일 주소를 입력하세요"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "구독 중..." : "구독하기"}
        </Button>
      </form>
    </div>
  );
}