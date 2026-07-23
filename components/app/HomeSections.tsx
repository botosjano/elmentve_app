import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { UPCOMING, SAVED } from "@/lib/mockData";
import { Thumb } from "./itemIcons";

function SectionHead({ title, allHref }: { title: string; allHref: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <Link href={allHref} className="flex items-center gap-1 text-sm font-semibold text-indigo hover:underline">
        Összes <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function HomeSections() {
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      {/* Közelgő */}
      <section>
        <SectionHead title="Közelgő" allHref="/app/emlekeztetok" />
        <div className="panel divide-y divide-panel-line">
          {UPCOMING.map((it) => (
            <Link key={it.id} href={`/app/tetel/${it.id}`} className="flex items-center gap-3.5 px-4 py-4 first:rounded-t-[var(--radius-panel)] last:rounded-b-[var(--radius-panel)] hover:bg-lilac/5">
              <Thumb icon={it.icon} tint={it.tint} />
              <span className="flex-1 font-medium text-ink">{it.title}</span>
              <span className={`text-sm ${it.soon ? "font-semibold text-mint" : "text-muted"}`}>{it.due}</span>
              <ChevronRight className="h-4 w-4 text-muted/60" />
            </Link>
          ))}
        </div>
      </section>

      {/* Legutóbb elmentve */}
      <section>
        <SectionHead title="Legutóbb elmentve" allHref="/app/mentett" />
        <div className="panel divide-y divide-panel-line">
          {SAVED.map((it) => (
            <Link key={it.id} href={`/app/tetel/${it.id}`} className="flex items-center gap-3.5 px-4 py-3.5 first:rounded-t-[var(--radius-panel)] last:rounded-b-[var(--radius-panel)] hover:bg-lilac/5">
              <Thumb icon={it.icon} tint={it.tint} />
              <span className="flex-1 font-medium text-ink">{it.title}</span>
              <ChevronRight className="h-4 w-4 text-muted/60" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
