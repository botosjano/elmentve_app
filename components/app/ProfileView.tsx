import Link from "next/link";
import { Settings, Bell, Bookmark, ChevronRight, LogOut, Sparkles } from "lucide-react";
import { PROFILE, PLAN } from "@/lib/mockData";

const LINKS = [
  { href: "/app/beallitasok", label: "Beállítások", icon: Settings },
  { href: "/app/emlekeztetok", label: "Emlékeztetők", icon: Bell },
  { href: "/app/mentett", label: "Elmentett dolgok", icon: Bookmark },
];

/** Egyszerű profil-nézet (a mobil "Profil" fül célja). */
export function ProfileView() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-[2rem] font-medium tracking-tight text-ink sm:text-[2.5rem]">Profil</h1>

      <div className="panel flex flex-col items-center px-6 py-8 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo text-2xl font-semibold text-white">{PROFILE.initials}</span>
        <p className="mt-4 text-xl font-semibold text-ink">{PROFILE.name}</p>
        <p className="text-sm text-muted">{PROFILE.email}</p>
        <Link href="/app/beallitasok" className="mt-5 rounded-[var(--radius-btn)] border border-lilac/40 bg-white px-5 py-2.5 text-sm font-semibold text-indigo transition-colors hover:bg-lilac/5">
          Profil szerkesztése
        </Link>
      </div>

      <div className="panel mt-4 flex items-center gap-3 bg-mint/10 px-5 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint/20 text-mint"><Sparkles className="h-5 w-5" /></span>
        <div className="flex-1">
          <p className="font-semibold text-ink">Pro próba – {PLAN.trialDaysLeft} nap van hátra</p>
          <p className="text-[13px] text-muted">Minden Pro funkció elérhető.</p>
        </div>
        <Link href="/app/beallitasok" className="cta px-4 py-2 text-sm"><span className="text-[#05372d]">Pro-ra váltok</span></Link>
      </div>

      <div className="panel mt-4 divide-y divide-panel-line">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex items-center gap-3.5 px-5 py-4 first:rounded-t-[var(--radius-panel)] hover:bg-lilac/5">
            <Icon className="h-5 w-5 text-lilac" />
            <span className="flex-1 font-medium text-ink">{label}</span>
            <ChevronRight className="h-4 w-4 text-muted/60" />
          </Link>
        ))}
        <button type="button" className="flex w-full items-center gap-3.5 rounded-b-[var(--radius-panel)] px-5 py-4 text-left hover:bg-coral/5">
          <LogOut className="h-5 w-5 text-coral" />
          <span className="flex-1 font-medium text-coral">Kijelentkezés</span>
        </button>
      </div>
    </div>
  );
}
