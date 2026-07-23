import Link from "next/link";
import {
  Home, ChevronRight, CheckCircle2, CalendarDays, ShieldCheck, FolderOpen, Bell,
  Info, ExternalLink, Pencil, BellPlus, FileText,
} from "lucide-react";
import type { Item } from "@/lib/mockData";
import { Thumb } from "./itemIcons";

function endLabel(category: Item["category"]): string {
  if (category === "Garancia") return "Várható garancia vége";
  if (category === "Határidő") return "Határidő";
  return "Forduló";
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Bell; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3.5 py-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lilac/12 text-lilac">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="flex-1 text-muted">{label}:</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}

export function ItemDetail({ item }: { item: Item }) {
  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-2 text-sm text-muted" aria-label="Útvonal">
        <Link href="/app" className="flex items-center hover:text-ink"><Home className="h-4 w-4" /></Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/app/mentett" className="hover:text-ink">Elmentett dolgok</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="truncate text-ink">{item.title}</span>
      </nav>

      {/* Fejléc */}
      <div className="mb-6 flex items-center gap-4">
        <Thumb icon={item.icon} tint={item.tint} size="lg" />
        <div>
          <h1 className="text-[1.75rem] font-medium tracking-tight text-ink sm:text-[2.25rem]">{item.title}</h1>
          {item.status && (
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-mint/15 px-3 py-1 text-sm font-semibold text-mint">
              <CheckCircle2 className="h-4 w-4" /> {item.status}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bal: dokumentum / hely */}
        <div className="panel flex flex-col p-5 sm:p-6">
          {item.docLabel ? (
            <>
              <div className="flex flex-1 flex-col items-center justify-center rounded-[var(--radius-btn)] border border-dashed border-panel-line bg-white/60 py-14 text-center">
                <FileText className="h-12 w-12 text-lilac" strokeWidth={1.5} />
                <p className="mt-3 font-semibold text-ink">{item.docLabel}</p>
                <p className="text-[13px] text-muted">Mentett dokumentum-előnézet</p>
              </div>
              <button type="button" className="mt-5 flex items-center justify-center gap-2 rounded-[var(--radius-btn)] border border-lilac/40 bg-white py-3.5 font-semibold text-indigo transition-colors hover:bg-lilac/5">
                <ExternalLink className="h-5 w-5" /> Megnyitás
              </button>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-14 text-center">
              <FolderOpen className="h-12 w-12 text-lilac" strokeWidth={1.5} />
              <p className="mt-3 font-semibold text-ink">{item.location}</p>
              <p className="text-[13px] text-muted">Ehhez a tételhez nincs feltöltött dokumentum.</p>
            </div>
          )}
        </div>

        {/* Jobb: adatok + előzmények + műveletek */}
        <div className="flex flex-col gap-6">
          <div className="panel px-5 py-2 sm:px-6">
            <div className="divide-y divide-panel-line">
              {item.purchaseDate && <InfoRow icon={CalendarDays} label="Vásárlás dátuma" value={item.purchaseDate} />}
              {item.warrantyEnd && <InfoRow icon={ShieldCheck} label={endLabel(item.category)} value={item.warrantyEnd} />}
              {item.location && <InfoRow icon={FolderOpen} label="Hova tettem?" value={item.location} />}
              {item.notify && <InfoRow icon={Bell} label="Értesítések" value={item.notify} />}
            </div>
            {item.warrantyEnd && (
              <div className="mb-3 mt-1 flex items-start gap-2.5 rounded-[var(--radius-btn)] bg-lilac/8 px-4 py-3 text-[13px] text-muted">
                <Info className="h-4 w-4 shrink-0 text-lilac" />
                A megadott adatok alapján várható dátum. Ellenőrizd a dokumentumon.
              </div>
            )}
          </div>

          {item.history && item.history.length > 0 && (
            <div className="panel px-5 py-5 sm:px-6">
              <h2 className="mb-4 text-lg font-semibold text-ink">Értesítési előzmények</h2>
              <ol className="flex flex-col gap-4">
                {item.history.map((h, i) => (
                  <li key={i} className="flex items-center gap-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lilac/12 text-lilac">
                      <Bell className="h-4 w-4" />
                    </span>
                    <span className="flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-ink">{h.date}</span>
                        <span className="rounded-full bg-lilac/12 px-2 py-0.5 text-[12px] font-medium text-indigo">{h.offset}</span>
                      </span>
                      <span className="block text-[13px] text-muted">{h.status}</span>
                    </span>
                    {h.future && <span className="rounded-full border border-lilac/30 px-2.5 py-1 text-[12px] font-medium text-lilac">Jövőbeni</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-btn)] border border-lilac/40 bg-white py-3.5 font-semibold text-indigo transition-colors hover:bg-lilac/5">
              <Pencil className="h-5 w-5" /> Szerkesztem
            </button>
            <button type="button" className="cta flex flex-1 items-center justify-center gap-2 py-3.5">
              <BellPlus className="h-5 w-5 text-[#05372d]" />
              <span className="text-[#05372d]">Új emlékeztető</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
