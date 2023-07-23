import Link from "next/link";

export default function LinkButton({ children, href, className }: { children: string, href: string, className?: string }) {
    return (
        <Link className={`border border-blue-500 p-1 rounded-sm hover:bg-blue-300 hover:text-black ${className}`} href={href}>{children}</Link>
    )
}
