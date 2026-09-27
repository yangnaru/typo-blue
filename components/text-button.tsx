import * as React from "react";

import { cn } from "@/lib/utils";

// A button drawn as a blue word, for small actions beside other text: 읽음
// 표시, 삭제. The same size as every other button; see /design.
export function TextButton({
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={cn(
        "text-sm text-blue-500 cursor-pointer disabled:cursor-default disabled:text-neutral-500",
        className
      )}
      {...props}
    />
  );
}
