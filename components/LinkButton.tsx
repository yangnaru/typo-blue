import Link from "next/link";
import { ReactNode } from "react";

export default function LinkButton({
  children,
  href,
  className,
}: {
  children: ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <Link
      className={`border border-blue-500 p-1 rounded-sm hover:bg-blue-300 hover:text-black ${className}`}
      href={href}
    >
      {children}
    </Link>
  );
}
