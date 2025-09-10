import { connection } from "next/server";
import Logo from "@/components/Logo";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  return (
    <>
      <Logo />
      {children}
    </>
  );
}
