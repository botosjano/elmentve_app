"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus, LayoutGrid, ShieldCheck, CalendarDays, MapPin, Calendar, Bell, FileText, ChevronRight, type LucideIcon } from "lucide-react";
import { ITEMS, type Category } from "@/lib/mockData";
import { Thumb } from "./itemIcons";

type Filter = "Minden" | Category;
const FILTERS: { key: Filter; icon: LucideIcon }[] = [
  { key: "Minden", icon: LayoutGrid },
  { key: "Garancia", icon: ShieldCheck },
  { key: "Határidő", icon: CalendarDays },
  { key: "Hova tettem?", icon: MapPin },
];

const CATEGORY_ICON: Record<Category, LucideIcon> = {
  "Garancia": ShieldCheck,
  "Határidő": CalendarDays,
  "Hova tettem?": MapPin,
};
const META_ICON = { calendar: Calendar, bell: Bell, location: MapPin, file: FileText };

export function SavedItemsList() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("Minden");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ITEMS.filter((it) => {
      if (filter !== "Minden" && it.category !== filter) return false;
      if (q && !(`${it.title} ${it.category}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [query, filter]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-[2rem] font-medium tracking-tight text-ink sm:text-[2.5rem]">Elmentett dolgok</h1>
        <Link href="/app" className="cta hidden items-center gap-2 px-5 py-3 sm:flex">
          <Plus className="h-5 w-5 text-[#05372d]" />
          <span className="text-[#05372d]">Új mentés</span>
        </Link>
      </div>

      {/* Keresés */}
      <div className="panel flex items-center gap-3 px-5 py-4">
        <Search className="h-5 w-5 shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Keresés név vagy kategória alapján"
          className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
        />
      </div>

      {/* Szűrők */}
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map(({ key, icon: Icon }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors ${
                active ? "border-transparent bg-lilac/15 text-indigo" : "border-panel-line bg-white text-ink/75 hover:border-lilac/40"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-indigo" : "text-lilac"}`} />
              {key}
            </button>
          );
        })}
      </div>

      {/* Lista */}
      <div className="panel mt-4 divide-y divide-panel-line">
        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-muted">Nincs a keresésnek megfelelő tétel.</p>
        ) : (
          items.map((it) => {
            const Cat = CATEGORY_ICON[it.category];
            const Meta = META_ICON[it.metaIcon];
            return (
              <Link key={it.id} href={`/app/tetel/${it.id}`} className="flex items-center gap-4 px-4 py-4 first:rounded-t-[var(--radius-panel)] last:rounded-b-[var(--radius-panel)] hover:bg-lilac/5">
                <Thumb icon={it.icon} tint={it.tint} size="md" />
                <span className="min-w-0 flex-1 font-semibold text-ink">{it.title}</span>
                <span className="hidden items-center gap-1.5 rounded-full bg-lilac/12 px-3 py-1.5 text-[13px] font-medium text-indigo sm:flex">
                  <Cat className="h-3.5 w-3.5" /> {it.category}
                </span>
                <span className="hidden items-center gap-1.5 text-sm text-muted lg:flex lg:w-56">
                  <Meta className="h-4 w-4 shrink-0" /> {it.meta}
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted/60" />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
