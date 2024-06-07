import Logo from "@/components/Logo";
import Link from "next/link";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Logo />
      <h2 className="text-xl my-2">
        <Link href="/account">계정 관리</Link>
      </h2>
      {children}
    </>
  );
}
