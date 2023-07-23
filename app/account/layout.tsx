import Logo from "@/components/Logo";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
    return <>
        <Logo />
        <h2 className="text-xl my-2">계정 관리</h2>
        {children}
    </>
}
