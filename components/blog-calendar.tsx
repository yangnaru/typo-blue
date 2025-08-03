"use client";

import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { format, isSameDay, isSameMonth, differenceInDays, isToday, subDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Edit3, ExternalLink, Calendar as CalendarIcon, MousePointer } from "lucide-react";
import Link from "next/link";
import { getBlogPostEditPath, getBlogPostPath } from "@/lib/paths";

interface BlogPost {
  id: string;
  title: string | null;
  published: Date | null;
  first_published: Date | null;
  blogId: string;
}

interface BlogCalendarProps {
  posts: BlogPost[];
  blogSlug: string;
}

export function BlogCalendar({ posts, blogSlug }: BlogCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedRange, setSelectedRange] = useState<{from: Date; to?: Date} | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectionMode, setSelectionMode] = useState<'single' | 'range'>('single');

  // Filter only published posts and use first_published date
  const publishedPosts = posts.filter(post => post.published !== null && post.first_published !== null);

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
    let currentStreakInData = 1;
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
    const today = new Date();
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
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  const toggleSelectionMode = () => {
    const newMode = selectionMode === 'single' ? 'range' : 'single';
    setSelectionMode(newMode);
    
    // Clear selections when switching modes
    if (newMode === 'single') {
      setSelectedRange(undefined);
    } else {
      setSelectedDate(undefined);
    }
  };

  const clearSelection = () => {
    setSelectedDate(undefined);
    setSelectedRange(undefined);
  };


  const isCurrentMonth = isSameMonth(currentMonth, new Date());

  return (
    <div className="space-y-4">
      <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>월별 발행 현황</CardTitle>
              <div className="flex items-center gap-2">
                {/* Selection Mode Toggle */}
                <div className="flex items-center gap-1 mr-2">
                  <Button
                    variant={selectionMode === 'single' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => selectionMode !== 'single' && toggleSelectionMode()}
                    disabled={selectionMode === 'single'}
                  >
                    <MousePointer className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={selectionMode === 'range' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => selectionMode !== 'range' && toggleSelectionMode()}
                    disabled={selectionMode === 'range'}
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Clear Selection */}
                {((selectionMode === 'single' && selectedDate) || (selectionMode === 'range' && selectedRange)) && (
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    선택 해제
                  </Button>
                )}
                
                {/* Month Navigation */}
                <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[120px] text-center font-medium">
                  {format(currentMonth, "yyyy년 MM월")}
                </span>
                <Button variant="outline" size="sm" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={goToCurrentMonth} 
                  disabled={isCurrentMonth}
                  title="이번 달로 이동"
                >
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Calendar - Left side on small screens and up */}
              <div className="flex-shrink-0">
                {selectionMode === 'single' ? (
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    modifiers={{
                      published: publicationDates
                    }}
                    modifiersClassNames={{
                      published: "bg-blue-100 dark:bg-blue-900 font-semibold"
                    }}
                    className="rounded-md border"
                  />
                ) : (
                  <Calendar
                    mode="range"
                    selected={selectedRange}
                    onSelect={(range) => {
                      if (range?.from) {
                        setSelectedRange({
                          from: range.from,
                          to: range.to
                        });
                      } else {
                        setSelectedRange(undefined);
                      }
                    }}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    modifiers={{
                      published: publicationDates
                    }}
                    modifiersClassNames={{
                      published: "bg-blue-100 dark:bg-blue-900 font-semibold"
                    }}
                    className="rounded-md border"
                  />
                )}
                <div className="mt-4 text-sm text-muted-foreground">
                  이번 달 발행 글: <Badge variant="secondary">{currentMonthPosts.length}개</Badge>
                </div>
              </div>

              {/* Posts List - Right side on small screens and up, below on mobile */}
              <div className="flex-1 min-w-0">
                {selectedPosts.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-medium mb-3">
                      {selectionMode === 'single' && selectedDate ? (
                        <>
                          {format(selectedDate, "yyyy년 MM월 dd일")} 발행된 글
                          <Badge variant="secondary" className="ml-2">
                            {selectedPosts.length}개
                          </Badge>
                        </>
                      ) : selectionMode === 'range' && selectedRange ? (
                        <>
                          {selectedRange.to ? (
                            `${format(selectedRange.from, "MM/dd")} - ${format(selectedRange.to, "MM/dd")} 발행된 글`
                          ) : (
                            `${format(selectedRange.from, "yyyy년 MM월 dd일")}부터 선택 중`
                          )}
                          <Badge variant="secondary" className="ml-2">
                            {selectedPosts.length}개
                          </Badge>
                        </>
                      ) : null}
                    </h4>
                    
                    {/* Range Statistics */}
                    {selectionMode === 'range' && selectedRange?.to && selectedPosts.length > 0 && (
                      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">{selectedPosts.length}</span>
                            <span className="text-muted-foreground ml-1">총 글</span>
                          </div>
                          <div>
                            <span className="font-medium">
                              {Math.ceil(differenceInDays(selectedRange.to, selectedRange.from) + 1)}
                            </span>
                            <span className="text-muted-foreground ml-1">일간</span>
                          </div>
                          <div>
                            <span className="font-medium">
                              {(selectedPosts.length / (Math.ceil(differenceInDays(selectedRange.to, selectedRange.from) + 1))).toFixed(1)}
                            </span>
                            <span className="text-muted-foreground ml-1">글/일</span>
                          </div>
                          <div>
                            <span className="font-medium">
                              {Array.from(new Set(selectedPosts.map(post => format(post.first_published!, 'yyyy-MM-dd')))).length}
                            </span>
                            <span className="text-muted-foreground ml-1">활성일</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {selectedPosts.map(post => (
                        <div key={post.id} className="p-3 border rounded-lg flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium truncate">
                              {post.title || "무제"}
                            </h5>
                            <p className="text-sm text-muted-foreground">
                              {selectionMode === 'range' ? (
                                `${format(post.first_published!, "MM/dd HH:mm")}`
                              ) : (
                                format(post.first_published!, "HH:mm")
                              )}
                            </p>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Link href={getBlogPostEditPath(blogSlug, post.id)}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Edit3 className="h-4 w-4" />
                                <span className="sr-only">수정</span>
                              </Button>
                            </Link>
                            <Link href={getBlogPostPath(blogSlug, post.id)} target="_blank">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <ExternalLink className="h-4 w-4" />
                                <span className="sr-only">보기</span>
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (selectionMode === 'single' && selectedDate) || (selectionMode === 'range' && selectedRange?.from) ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {selectionMode === 'single' && selectedDate ? (
                        `${format(selectedDate, "yyyy년 MM월 dd일")}에 발행된 글이 없습니다`
                      ) : selectionMode === 'range' && selectedRange ? (
                        selectedRange.to ? (
                          `${format(selectedRange.from, "MM/dd")} - ${format(selectedRange.to, "MM/dd")} 기간에 발행된 글이 없습니다`
                        ) : (
                          "종료 날짜를 선택하여 범위를 완성하세요"
                        )
                      ) : null}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[200px]">
                    <p className="text-muted-foreground text-center">
                      {selectionMode === 'single' ? (
                        "달력에서 날짜를 선택하여 발행된 글을 확인하세요"
                      ) : (
                        "달력에서 시작 날짜를 선택하여 범위 선택을 시작하세요"
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>발행 통계</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{publishedPosts.length}</div>
              <div className="text-sm text-muted-foreground">총 발행 글</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{Object.keys(postsByDate).length}</div>
              <div className="text-sm text-muted-foreground">발행 일수</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{longestStreak}</div>
              <div className="text-sm text-muted-foreground">최장 연속</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{currentStreak}</div>
              <div className="text-sm text-muted-foreground">현재 연속</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}