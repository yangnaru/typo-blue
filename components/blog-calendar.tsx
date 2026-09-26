"use client";

import { Calendar } from "@/components/ui/calendar";
import { useState, useCallback, useEffect } from "react";
import { format, isSameDay, isSameMonth, differenceInDays, subDays, isWithinInterval, startOfDay, endOfDay, addDays, addMonths, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import Link from "next/link";
import { getBlogPostEditPath, getBlogPostPath } from "@/lib/paths";
import { Pill, PillItem } from "@/components/pill";
import { PlainButton } from "@/components/plain-button";

interface BlogPost {
  id: string;
  title: string | null;
  published: Date | null;
  first_published: Date | null;
  blogId: string;
}

// Days on the calendar are days in Seoul, as everywhere else on the site,
// whatever the viewer's or the server's time zone. The Dates below hold Seoul's
// wall-clock time in local fields, so date-fns's local-time helpers see Seoul.
const TIME_ZONE = "Asia/Seoul";
const nowInSeoul = () => toZonedTime(new Date(), TIME_ZONE);

interface BlogCalendarProps {
  posts: BlogPost[];
  blogSlug: string;
}

export function BlogCalendar({ posts, blogSlug }: BlogCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedRange, setSelectedRange] = useState<{from: Date; to?: Date} | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState<Date>(nowInSeoul);
  const [selectionMode, setSelectionMode] = useState<'single' | 'range'>('single');

  // Filter only published posts and use first_published date
  const publishedPosts = posts
    .filter(post => post.published !== null && post.first_published !== null)
    .map(post => ({ ...post, first_published: toZonedTime(post.first_published!, TIME_ZONE) }));

  // Create a map of dates to posts for quick lookup
  const postsByDate = publishedPosts.reduce((acc, post) => {
    const dateKey = format(post.first_published!, "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(post);
    return acc;
  }, {} as Record<string, BlogPost[]>);

  // Get all publication dates
  const publicationDates = publishedPosts.map(post => post.first_published!);

  // Get posts for selected date or range
  const getSelectedPosts = () => {
    if (selectionMode === 'single' && selectedDate) {
      return publishedPosts.filter(post => 
        post.first_published && isSameDay(post.first_published, selectedDate)
      );
    } else if (selectionMode === 'range' && selectedRange?.from) {
      const fromDate = startOfDay(selectedRange.from);
      const toDate = selectedRange.to ? endOfDay(selectedRange.to) : endOfDay(selectedRange.from);
      
      return publishedPosts.filter(post => 
        post.first_published && isWithinInterval(post.first_published, { start: fromDate, end: toDate })
      );
    }
    return [];
  };

  const selectedPosts = getSelectedPosts();

  // Get posts for current month
  const currentMonthPosts = publishedPosts.filter(post => 
    post.first_published && isSameMonth(post.first_published, currentMonth)
  );


  // Calculate streaks
  const calculateStreaks = () => {
    if (publishedPosts.length === 0) {
      return { longestStreak: 0, currentStreak: 0 };
    }

    // Get unique publication dates (one post per day counts as active)
    const uniqueDates = Array.from(new Set(
      publishedPosts.map(post => format(post.first_published!, 'yyyy-MM-dd'))
    )).sort();

    const dateObjects = uniqueDates.map(dateStr => new Date(dateStr));
    
    let longestStreak = 1;
    let tempStreak = 1;

    // Calculate longest streak in historical data
    for (let i = 1; i < dateObjects.length; i++) {
      const dayDiff = differenceInDays(dateObjects[i], dateObjects[i - 1]);
      
      if (dayDiff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    // Calculate current streak (from today backwards)
    let currentStreak = 0;
    const today = nowInSeoul();
    let checkDate = today;
    
    // Check if there's a post today or yesterday (to account for different time zones)
    while (currentStreak < 2) {
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      const hasPost = uniqueDates.includes(dateStr);
      
      if (hasPost) {
        if (currentStreak === 0) {
          // Found the start of the streak
          let streakDate = checkDate;
          while (true) {
            const streakDateStr = format(streakDate, 'yyyy-MM-dd');
            if (uniqueDates.includes(streakDateStr)) {
              currentStreak++;
              streakDate = subDays(streakDate, 1);
            } else {
              break;
            }
          }
        }
        break;
      }
      
      checkDate = subDays(checkDate, 1);
      if (differenceInDays(today, checkDate) > 1) {
        // If no post in the last 2 days, no current streak
        break;
      }
    }

    return { longestStreak, currentStreak };
  };

  const { longestStreak, currentStreak } = calculateStreaks();

  // Navigation functions
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const goToCurrentMonth = useCallback(() => {
    setCurrentMonth(nowInSeoul());
  }, []);

  const toggleSelectionMode = useCallback(() => {
    const newMode = selectionMode === 'single' ? 'range' : 'single';
    setSelectionMode(newMode);
    
    // Clear selections when switching modes
    if (newMode === 'single') {
      setSelectedRange(undefined);
    } else {
      setSelectedDate(undefined);
    }
  }, [selectionMode]);

  const clearSelection = useCallback(() => {
    setSelectedDate(undefined);
    setSelectedRange(undefined);
  }, []);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.target !== document.body && !(event.target as Element)?.closest('[data-calendar-container]')) {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) {
          goToPreviousMonth();
        } else if (selectedDate) {
          const newDate = subDays(selectedDate, 1);
          setSelectedDate(newDate);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) {
          goToNextMonth();
        } else if (selectedDate) {
          const newDate = addDays(selectedDate, 1);
          setSelectedDate(newDate);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (selectedDate) {
          const newDate = subDays(selectedDate, 7);
          setSelectedDate(newDate);
          if (!isSameMonth(newDate, currentMonth)) {
            setCurrentMonth(newDate);
          }
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (selectedDate) {
          const newDate = addDays(selectedDate, 7);
          setSelectedDate(newDate);
          if (!isSameMonth(newDate, currentMonth)) {
            setCurrentMonth(newDate);
          }
        }
        break;
      case 'Home':
        event.preventDefault();
        const today = nowInSeoul();
        setSelectedDate(today);
        setCurrentMonth(today);
        break;
      case 'PageUp':
        event.preventDefault();
        if (event.shiftKey) {
          setCurrentMonth(prev => subMonths(prev, 12));
        } else {
          goToPreviousMonth();
        }
        break;
      case 'PageDown':
        event.preventDefault();
        if (event.shiftKey) {
          setCurrentMonth(prev => addMonths(prev, 12));
        } else {
          goToNextMonth();
        }
        break;
      case 'Escape':
        event.preventDefault();
        clearSelection();
        break;
      case 'Enter':
      case ' ':
        if (selectedDate && selectionMode === 'single') {
          event.preventDefault();
          // Handle selection confirmation if needed
        }
        break;
    }
  }, [selectedDate, currentMonth, selectionMode, goToPreviousMonth, goToNextMonth, clearSelection]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const isCurrentMonth = isSameMonth(currentMonth, nowInSeoul());

  const hasSelection =
    (selectionMode === "single" && selectedDate) ||
    (selectionMode === "range" && selectedRange);
  const rangeDays = selectedRange?.to
    ? Math.ceil(differenceInDays(selectedRange.to, selectedRange.from) + 1)
    : 0;
  const publishedModifier = {
    // Months are moved with the links above, so hide the calendar's own.
    hideNavigation: true,
    locale: ko,
    modifiers: { published: publicationDates },
    modifiersClassNames: {
      published: "bg-blue-100 dark:bg-blue-900 font-semibold rounded-md",
    },
  };

  return (
    <div
      className="space-y-4"
      data-calendar-container
      tabIndex={0}
      role="application"
      aria-label="블로그 발행 캘린더"
    >
      <div className="sr-only" id="calendar-instructions">
        키보드 단축키: 화살표 키로 날짜 이동, Ctrl+화살표로 월 이동, Home으로 오늘로 이동, PageUp/PageDown으로 월 변경, Escape로 선택 해제
      </div>

      <div className="flex flex-row flex-wrap items-center gap-2">
        <Pill aria-label="달 이동">
          <PillItem onClick={goToPreviousMonth} title="이전 달 (Ctrl+←)">
            ‹ 이전 달
          </PillItem>
          <PillItem
            onClick={goToCurrentMonth}
            disabled={isCurrentMonth}
            title="이번 달로 이동 (Home)"
          >
            이번 달
          </PillItem>
          <PillItem onClick={goToNextMonth} title="다음 달 (Ctrl+→)">
            다음 달 ›
          </PillItem>
        </Pill>
        <span className="font-bold" role="status" aria-live="polite">
          {format(currentMonth, "yyyy년 MM월")}
        </span>
      </div>

      <div className="flex flex-row flex-wrap items-center gap-2">
        <Pill aria-label="선택 방식">
          <PillItem
            active={selectionMode === "single"}
            aria-pressed={selectionMode === "single"}
            onClick={() => selectionMode !== "single" && toggleSelectionMode()}
          >
            하루 선택
          </PillItem>
          <PillItem
            active={selectionMode === "range"}
            aria-pressed={selectionMode === "range"}
            onClick={() => selectionMode !== "range" && toggleSelectionMode()}
          >
            기간 선택
          </PillItem>
        </Pill>
        {hasSelection && (
          <PlainButton onClick={clearSelection}>선택 해제</PlainButton>
        )}
      </div>

      {selectionMode === "single" ? (
        <Calendar
          mode="single"
          today={nowInSeoul()}
          selected={selectedDate}
          onSelect={setSelectedDate}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          className="rounded-sm border border-blue-500"
          {...publishedModifier}
        />
      ) : (
        <Calendar
          mode="range"
          today={nowInSeoul()}
          selected={selectedRange}
          onSelect={(range) => {
            if (range?.from) {
              setSelectedRange({ from: range.from, to: range.to });
            } else {
              setSelectedRange(undefined);
            }
          }}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          className="rounded-sm border border-blue-500"
          {...publishedModifier}
        />
      )}

      <p className="text-neutral-500">
        이번 달 {currentMonthPosts.length}개 · 전체 {publishedPosts.length}개 ·
        발행 일수 {Object.keys(postsByDate).length}일 · 최장 연속{" "}
        {longestStreak}일 · 현재 연속 {currentStreak}일
      </p>

      {hasSelection ? (
        <div className="space-y-2">
          <h3 className="text-lg">
            {selectionMode === "single" && selectedDate
              ? `${format(selectedDate, "yyyy년 MM월 dd일")}에 발행된 글`
              : selectedRange?.to
                ? `${format(selectedRange.from, "yyyy-MM-dd")} ~ ${format(selectedRange.to, "yyyy-MM-dd")}에 발행된 글`
                : `${format(selectedRange!.from, "yyyy년 MM월 dd일")}부터 선택 중`}
          </h3>
          {selectionMode === "range" && selectedRange?.to && (
            <p className="text-neutral-500">
              {rangeDays}일간 {selectedPosts.length}개 · 하루 평균{" "}
              {(selectedPosts.length / rangeDays).toFixed(1)}개 · 활성일{" "}
              {
                new Set(
                  selectedPosts.map((post) =>
                    format(post.first_published!, "yyyy-MM-dd")
                  )
                ).size
              }
              일
            </p>
          )}
          {selectedPosts.length === 0 ? (
            <p className="text-neutral-500">
              {selectionMode === "range" && !selectedRange?.to
                ? "종료 날짜를 선택하여 범위를 완성하세요."
                : "발행된 글이 없습니다."}
            </p>
          ) : (
            <ul className="space-y-2">
              {selectedPosts.map((post) => (
                <li key={post.id} className="break-keep">
                  <Link href={getBlogPostEditPath(blogSlug, post.id)}>
                    <span className="font-bold tabular-nums">
                      {format(
                        post.first_published!,
                        selectionMode === "range" ? "MM-dd HH:mm" : "HH:mm"
                      )}
                    </span>{" "}
                    {post.title || "무제"}
                  </Link>
                  <span className="text-neutral-500 text-sm">
                    {" · "}
                    <Link
                      href={getBlogPostPath(blogSlug, post.id)}
                      target="_blank"
                      className="underline"
                    >
                      보기
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-neutral-500">
          {selectionMode === "single"
            ? "달력에서 날짜를 선택하면 그날 발행된 글을 볼 수 있습니다."
            : "달력에서 시작 날짜를 선택하여 기간을 고르세요."}
        </p>
      )}
    </div>
  );
}
