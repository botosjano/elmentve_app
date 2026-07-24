"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus, CalendarDays, Mail, MessageSquare, MessageCircle, Check, Clock,
  MoreVertical, BellOff, CheckCircle2, CalendarClock, type LucideIcon,
} from "lucide-react";
import { REMINDERS, BUCKET_ORDER, PROFILE, type Channel, type Reminder } from "@/lib/mockData";
import { Thumb } from "./itemIcons";

const CHANNEL_ICON: Record<Channel, LucideIcon> = { email: Mail, sms: MessageSquare, chat: MessageCircle };
type Status = "active" | "done" | "snoozed";

function ReminderRow({ r }: { r: Reminder }) {
  const [status, setStatus] = useState<Status>("active");
  const Ch = CHANNEL_ICON[r.channel];
  return (
    <div className={`flex flex-wrap items-center gap-3 px-4 py-4 sm:flex-nowrap sm:gap-4 ${status !== "active" ? "opacity-60" : ""}`}>
      <Thumb icon={r.icon} tint={r.tint} size="md" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{r.title}</p>
        <p className="truncate text-[13px] text-muted">{r.subtitle}</p>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-muted">
        <CalendarDays className="h-4 w-4 shrink-0" />
        <span className="whitespace-nowrap">{r.dateLabel} · {r.time}</span>
      </div>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint/12 text-mint">
        <Ch className="h-4 w-4" />
      </span>

      {status === "active" ? (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setStatus("done")} className="flex items-center gap-1.5 rounded-full border border-mint/40 px-3.5 py-2 text-sm font-semibold text-mint transition-colors hover:bg-mint/10">
            <Check className="h-4 w-4" /> Elintéztem
          </button>
          <button type="button" onClick={() => setStatus("snoozed")} className="flex items-center gap-1.5 rounded-full border border-lilac/40 px-3.5 py-2 text-sm font-semibold text-indigo transition-colors hover:bg-lilac/10">
            <Clock className="h-4 w-4" /> Elhalasztom
          </button>
          <button type="button" aria-label="További műveletek" className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-lilac/10">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setStatus("active")} className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ${status === "done" ? "bg-mint/15 text-mint" : "bg-lilac/15 text-indigo"}`}>
          {status === "done" ? <><CheckCircle2 className="h-4 w-4" /> Elintézve</> : <><Clock className="h-4 w-4" /> Elhalasztva</>}
        </button>
      )}
    </div>
  );
}

export function RemindersView() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-[2rem] font-medium tracking-tight text-ink sm:text-[2.5rem]">Emlékeztetők</h1>
          <Link href="/app" className="flex items-center gap-2 rounded-[var(--radius-btn)] bg-indigo px-5 py-3 font-semibold text-white transition-colors hover:brightness-110">
            <Plus className="h-5 w-5" /> <span className="hidden sm:inline">Új emlékeztető</span>
          </Link>
        </div>

        {BUCKET_ORDER.map((bucket) => {
          const rows = REMINDERS.filter((r) => r.bucket === bucket);
          if (rows.length === 0) return null;
          return (
            <section key={bucket} className="mb-7">
              <h2 className="mb-2.5 text-lg font-semibold text-ink">{bucket}</h2>
              <div className="panel divide-y divide-panel-line">
                {rows.map((r) => <ReminderRow key={r.id} r={r} />)}
              </div>
            </section>
          );
        })}

        <p className="mt-2 flex items-center justify-center gap-2 text-[13px] text-muted">
          <CalendarClock className="h-4 w-4" /> Időrendben, a leghamarabbi elöl.
        </p>
      </div>

      {/* Csendes órák */}
      <aside>
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Csendes órák</h2>
            <Link href="/app/beallitasok" aria-label="Csendes órák szerkesztése" className="flex h-9 w-9 items-center justify-center rounded-full text-lilac hover:bg-lilac/10">
              <Clock className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{PROFILE.quietHours}</p>
          <div className="mt-4 flex items-start gap-3 border-t border-panel-line pt-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint/12 text-mint">
              <BellOff className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Email · SMS <span className="text-muted">(Pro)</span></p>
              <p className="text-[13px] text-muted">Ez idő alatt az értesítések némítva vannak.</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
