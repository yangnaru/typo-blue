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
      {children}
    </>
  );
}
