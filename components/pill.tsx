import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

// A row of joined, blue-outlined segments: the PlainButton style, grouped.
// Long groups scroll sideways instead of wrapping, so the outline stays whole.
export function Pill({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="group"
      className={cn(
        "inline-flex max-w-full overflow-x-auto whitespace-nowrap rounded-sm border border-blue-500 divide-x divide-blue-500 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      {...props}
    />
  );
}

// One segment. `active` fills it in; pass aria-current for links or
// aria-pressed for toggles so the state is announced as well as shown.
export function PillItem({
  className,
  active = false,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & {
  active?: boolean;
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "shrink-0 px-2 py-1 cursor-pointer disabled:cursor-default disabled:opacity-50",
        active
          ? "bg-blue-500 text-white"
          : "hover:bg-blue-300 hover:text-black disabled:hover:bg-transparent disabled:hover:text-inherit",
        className
      )}
      {...(asChild ? {} : { type: "button" })}
      {...props}
    />
  );
}
