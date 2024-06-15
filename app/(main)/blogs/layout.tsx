import Logo from "@/components/Logo";
import React from "react";

export default function BlogsLayout({ children }: { children: React.ReactNode }) {
    return <>
        <Logo />
        {children}
    </>
}
