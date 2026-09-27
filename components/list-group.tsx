import type { ReactNode } from "react";
import { formatSeoulDate, getRelativeDay } from "@/lib/dates";

// Lists split under small grey headings with a rule, such as days or years.
// The spacing is fixed here and takes no className, so every such list keeps
// the footer line's rhythm: 32px above each heading's rule, 12px below it.
// See /design.
export function ListGroups({ children }: { children: ReactNode }) {
  return <div className="space-y-8">{children}</div>;
}

export function ListGroup({
  heading,
  children,
}: {
  heading: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h4 className="flex items-baseline gap-2 text-xs font-bold text-neutral-500 after:flex-1 after:border-b after:border-neutral-200 dark:after:border-neutral-800">
        {heading}
      </h4>
      {children}
    </section>
  );
}

// The heading for a group of items from one day: "오늘 9월 27일 일",
// "어제 9월 26일 토", "9월 25일 목", or "2023년 7월 23일 일".
export function DayLabel({ date }: { date: Date }) {
  const relative = getRelativeDay(date);

  return (
    <>
      {relative && <span className="text-foreground">{relative}</span>}
      <span className="tabular-nums">
        {formatSeoulDate(date, { weekday: true })}
      </span>
    </>
  );
}
