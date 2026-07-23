"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { BOTTOM_LEFT, BOTTOM_RIGHT, type NavItem } from "./navItems";

function Tab({ item, active }: { item: NavItem; active: boolean }) {
  const { href, label, icon: Icon } = item;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="flex flex-1 flex-col items-center gap-1 pt-2 pb-1"
    >
      <span className={`h-0.5 w-6 rounded-full ${active ? "bg-indigo" : "bg-transparent"}`} />
      <Icon className={`h-6 w-6 ${active ? "text-indigo" : "text-muted"}`} strokeWidth={2} />
      <span className={`text-[11px] font-medium ${active ? "text-indigo" : "text-muted"}`}>{label}</span>
    </Link>
  );
}

/** Mobil fix alsó navigáció (< 1024px). Középen a kiemelt "Új mentés". */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Alsó navigáció"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-panel-line bg-white/90 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      {BOTTOM_LEFT.map((item) => (
        <Tab key={item.href} item={item} active={pathname === item.href} />
      ))}

      <div className="flex flex-1 justify-center">
        <Link
          href="/app"
          className="-mt-5 flex flex-col items-center gap-1"
          aria-label="Új mentés"
        >
          <span className="cta flex h-14 w-14 items-center justify-center rounded-full">
            <Plus className="h-7 w-7 text-[#05372d]" strokeWidth={2.5} />
          </span>
          <span className="text-[11px] font-medium text-mint">Új mentés</span>
        </Link>
      </div>

      {BOTTOM_RIGHT.map((item) => (
        <Tab key={item.href} item={item} active={pathname === item.href} />
      ))}
    </nav>
  );
}
