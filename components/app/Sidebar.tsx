"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Crown } from "lucide-react";
import { SIDEBAR_NAV } from "./navItems";

/** Desktop bal oldalsáv (>= 1024px): logó, navigáció, alul Pro-kártya. */
export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-nav shrink-0 flex-col gap-8 px-5 py-8 lg:flex">
      <Link href="/app" className="flex flex-col items-center gap-2.5 px-2">
        <Image src="/brand/mark.svg" alt="" width={72} height={72} className="h-16 w-16" priority />
        <Image src="/brand/wordmark.svg" alt="Elmentve" width={128} height={30} className="h-6 w-auto" priority />
      </Link>

      <nav className="flex flex-col gap-1.5" aria-label="Fő navigáció">
        {SIDEBAR_NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-[var(--radius-btn)] px-4 py-3 text-[15px] font-medium transition-colors ${
                active ? "bg-lilac/15 text-indigo" : "text-ink/75 hover:bg-lilac/10 hover:text-ink"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-indigo" : "text-lilac"}`} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="panel mt-auto p-4">
        <div className="flex items-center gap-2 text-ink">
          <Crown className="h-5 w-5 text-lilac" />
          <span className="font-semibold">Pro</span>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Több hely, intelligens emlékeztetők és még több.
        </p>
        <Link
          href="/app/beallitasok"
          className="mt-3 flex items-center justify-center rounded-[var(--radius-btn)] border border-lilac/40 bg-white px-4 py-2.5 text-sm font-semibold text-indigo transition-colors hover:bg-lilac/5"
        >
          Frissítés Pro-ra
        </Link>
      </div>
    </aside>
  );
}
