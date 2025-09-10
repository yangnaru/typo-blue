import { connection } from "next/server";
import Logo from "@/components/Logo";
import React from "react";

export default async function BlogsLayout({
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
