import { formatInTimeZone } from "date-fns-tz";
import { ko } from "date-fns/locale";

// Days are counted in Seoul, wherever the server or the reader is.
export const SEOUL = "Asia/Seoul";

// The yyyy-MM-dd day in Seoul that a moment falls on.
export function seoulDay(date: Date): string {
  return formatInTimeZone(date, SEOUL, "yyyy-MM-dd");
}

// A date the way a person says it: "9월 24일", or "2024년 3월 14일" outside the
// current year. `relative` says 오늘 or 어제 for those days instead, which only
// belongs on pages rendered per request and never on a permalink. `weekday`
// adds the day of the week (9월 24일 목) and `time` the time (9월 24일 14:05).
// `year: false` leaves the year out, for lists already grouped by year.
export function formatSeoulDate(
  date: Date,
  {
    relative = false,
    weekday = false,
    time = false,
    year,
    now = new Date(),
  }: {
    relative?: boolean;
    weekday?: boolean;
    time?: boolean;
    year?: boolean;
    now?: Date;
  } = {}
): string {
  const suffix = time ? ` ${formatInTimeZone(date, SEOUL, "HH:mm")}` : "";

  if (relative) {
    const relativeDay = getRelativeDay(date, now);
    if (relativeDay) return relativeDay + suffix;
  }

  const showYear =
    year ??
    formatInTimeZone(date, SEOUL, "yyyy") !==
      formatInTimeZone(now, SEOUL, "yyyy");
  const pattern =
    (showYear ? "yyyy년 M월 d일" : "M월 d일") + (weekday ? " EEE" : "");
  return formatInTimeZone(date, SEOUL, pattern, { locale: ko }) + suffix;
}

// 오늘 or 어제 when the date falls on one of those days in Seoul.
export function getRelativeDay(
  date: Date,
  now: Date = new Date()
): "오늘" | "어제" | null {
  const day = seoulDay(date);
  if (day === seoulDay(now)) return "오늘";
  // Seoul has no daylight saving, so a day ago is always yesterday there.
  if (day === seoulDay(new Date(now.getTime() - 24 * 60 * 60 * 1000))) {
    return "어제";
  }
  return null;
}

// Items in order, split wherever the day in Seoul changes. Each group keeps the
// date of its first item, to label it with.
export function groupBySeoulDay<T>(
  items: T[],
  getDate: (item: T) => Date
): { day: string; date: Date; items: T[] }[] {
  const groups: { day: string; date: Date; items: T[] }[] = [];
  for (const item of items) {
    const date = getDate(item);
    const day = seoulDay(date);
    const last = groups.at(-1);
    if (last?.day === day) last.items.push(item);
    else groups.push({ day, date, items: [item] });
  }
  return groups;
}
