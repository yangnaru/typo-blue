import { CalendarSkeleton } from "@/components/calendar-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">발행 캘린더</h1>
        <p className="text-muted-foreground">
          발행된 글의 일정을 달력으로 확인하세요.
        </p>
      </div>
      
      <CalendarSkeleton />
    </div>
  );
}