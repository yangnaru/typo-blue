import { connection } from "next/server";
import Logo from "@/components/Logo";
import Link from "next/link";
import { getAccountPath } from "@/lib/paths";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  return (
    <>
      <Logo />
      <h2 className="text-xl my-2">
        <Link href={getAccountPath()}>계정 관리</Link>
      </h2>
      {children}
    </>
  );
}
