import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

// The blue-outlined button of the original typo blue design.
const variants = {
  default:
    "border-blue-500 hover:bg-blue-300 hover:text-black disabled:hover:bg-transparent disabled:hover:text-inherit",
  destructive:
    "border-red-500 text-red-500 hover:bg-red-300 hover:text-black disabled:hover:bg-transparent disabled:hover:text-red-500",
};

export function plainButtonClassName(
  variant: keyof typeof variants = "default"
) {
  return cn(
    "inline-block border px-2 py-1 rounded-sm cursor-pointer disabled:cursor-default disabled:opacity-50",
    variants[variant]
  );
}

export function PlainButton({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(plainButtonClassName(variant), className)} {...props} />
  );
}
