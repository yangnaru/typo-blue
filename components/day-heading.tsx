import { formatSeoulDate, getRelativeDay } from "@/lib/dates";

// The heading over a group of items from one day: "오늘 9월 27일 일",
// "어제 9월 26일 토", "9월 25일 목", or "2023년 7월 23일 일", with a rule to the
// right edge.
export function DayHeading({ date }: { date: Date }) {
  const relative = getRelativeDay(date);

  return (
    <GroupHeading>
      {relative && <span className="text-foreground">{relative}</span>}
      <span className="tabular-nums">
        {formatSeoulDate(date, { weekday: true })}
      </span>
    </GroupHeading>
  );
}

// A small grey heading over a group of list items, such as a day or a year,
// with a rule to the right edge.
export function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="flex items-baseline gap-2 text-xs font-bold text-neutral-500 after:flex-1 after:border-b after:border-neutral-200 dark:after:border-neutral-800">
      {children}
    </h4>
  );
}
