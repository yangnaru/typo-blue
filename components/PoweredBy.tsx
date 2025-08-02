import { getRootPath } from "@/lib/paths";
import Link from "next/link";

export default function PoweredBy() {
  return (
    <footer className="flex items-center justify-between py-6">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={getRootPath()}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          powered by typo blue
        </Link>
      </div>
    </footer>
  );
}
