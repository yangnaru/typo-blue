import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function EditorSkeleton() {
  return (
    <div className="max-w-prose mx-auto space-y-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-24" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Title input skeleton */}
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>

      {/* Editor skeleton */}
      <Card>
        <CardContent className="p-6">
          {/* Toolbar skeleton */}
          <div className="flex items-center gap-1 pl-1 mb-6" role="toolbar" aria-label="텍스트 편집 도구 로딩 중">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-8" />
            ))}
          </div>

          {/* Content area skeleton */}
          <div className="space-y-4 min-h-[70vh]">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-6 w-3/4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions skeleton */}
      <Card className="border-t-2 border-t-border">
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="flex items-center gap-6">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}