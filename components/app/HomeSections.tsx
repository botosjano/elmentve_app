import Link from "next/link";
import Image from "next/image";
import { Car, IdCard, CalendarClock, ShoppingBag, FileText, ChevronRight, type LucideIcon } from "lucide-react";
import { UPCOMING, SAVED, type IconKey } from "@/lib/mockData";

const ICONS: Record<IconKey, LucideIcon> = {
  car: Car,
  id: IdCard,
  appointment: CalendarClock,
  warranty: ShoppingBag,
  doc: FileText,
  contract: FileText,
};

function SectionHead({ title, allHref, allLabel }: { title: string; allHref: string; allLabel: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <Link href={allHref} className="flex items-center gap-1 text-sm font-semibold text-indigo hover:underline">
        {allLabel} <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function HomeSections() {
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      {/* Közelgő */}
      <section>
        <SectionHead title="Közelgő" allHref="/app/emlekeztetok" allLabel="Összes" />
        <div className="panel divide-y divide-panel-line">
          {UPCOMING.map(({ id, title, due, icon, soon }) => {
            const Icon = ICONS[icon];
            return (
              <Link key={id} href={`/app/tetel/${id}`} className="flex items-center gap-3.5 px-4 py-4 first:rounded-t-[var(--radius-panel)] last:rounded-b-[var(--radius-panel)] hover:bg-lilac/5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lilac/12 text-lilac">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="flex-1 font-medium text-ink">{title}</span>
                <span className={`text-sm ${soon ? "font-semibold text-mint" : "text-muted"}`}>{due}</span>
                <ChevronRight className="h-4 w-4 text-muted/60" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Legutóbb elmentve */}
      <section>
        <SectionHead title="Legutóbb elmentve" allHref="/app/mentett" allLabel="Összes" />
        <div className="panel divide-y divide-panel-line">
          {SAVED.map(({ id, title, image }) => (
            <Link key={id} href={`/app/tetel/${id}`} className="flex items-center gap-3.5 px-4 py-3.5 first:rounded-t-[var(--radius-panel)] last:rounded-b-[var(--radius-panel)] hover:bg-lilac/5">
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-lilac/10">
                <Image src={image} alt="" fill sizes="44px" className="object-cover" />
              </span>
              <span className="flex-1 font-medium text-ink">{title}</span>
              <ChevronRight className="h-4 w-4 text-muted/60" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
