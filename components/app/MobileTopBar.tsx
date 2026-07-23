import Image from "next/image";
import Link from "next/link";
import { User } from "lucide-react";

/** Mobil felső sáv (< 1024px): logó + profil. */
export function MobileTopBar() {
  return (
    <header className="flex items-center justify-between px-5 pt-5 pb-2 lg:hidden">
      <Link href="/app" className="flex items-center gap-2">
        <Image src="/brand/mark.svg" alt="" width={36} height={36} className="h-9 w-9" priority />
        <Image src="/brand/wordmark.svg" alt="Elmentve" width={104} height={24} className="h-5 w-auto" priority />
      </Link>
      <Link
        href="/app/profil"
        aria-label="Profil"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-panel-line bg-white text-lilac"
      >
        <User className="h-5 w-5" />
      </Link>
    </header>
  );
}
