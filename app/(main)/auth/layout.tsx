import Logo from "@/components/Logo";
import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return <>
        <Logo />
        {children}
    </>
}
