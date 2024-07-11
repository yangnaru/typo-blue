import Link from "next/link";
import { ModeToggle } from "./mode-toggle";

export default function Logo() {
  return (
    <h1 className="flex flex-row justify-between items-center">
      <Link href="/" className="text-xl font-extrabold">
        typo <span className="text-blue-500">blue</span>
      </Link>
      <ModeToggle />
    </h1>
  );
}
