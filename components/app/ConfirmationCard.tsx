"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Quote, Tag, CalendarClock, Bell, Globe, Pencil, Check, CheckCircle2, FileText, Home } from "lucide-react";
import { parseInput, humanDate } from "@/lib/parse";

type FieldKey = "title" | "datetime" | "notifications" | "timezone";

/** 02-confirmation: az AI SOHA nem ment észrevétlenül -- itt a felhasználó
 *  ellenőrzi és szerkesztheti a felismert adatokat, majd kötelezően jóváhagyja. */
export function ConfirmationCard() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const parsed = useMemo(() => parseInput(q || "Emlékeztető"), [q]);

  const [fields, setFields] = useState({
    title: parsed.title,
    date: parsed.date,
    time: parsed.time,
    notifications: parsed.notifications,
    timezone: parsed.timezone,
  });
  const [editing, setEditing] = useState<FieldKey | null>(null);
  const [saved, setSaved] = useState(false);

  const set = (patch: Partial<typeof fields>) => setFields((f) => ({ ...f, ...patch }));

  if (saved) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="panel flex flex-col items-center px-6 py-14 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-mint/15 text-mint">
            <CheckCircle2 className="h-9 w-9" strokeWidth={2.5} />
          </span>
          <h2 className="mt-5 text-2xl font-semibold text-ink">Rendben, ezt mostantól figyeljük.</h2>
          <p className="mt-2 max-w-sm text-[15px] text-muted">
            {fields.title} — {humanDate(fields.date)}, {fields.time}. Időben szólunk.
          </p>
          <Link href="/app" className="cta mt-7 flex items-center gap-2 px-6 py-3">
            <Home className="h-4 w-4 text-[#05372d]" />
            <span className="text-[#05372d]">Vissza a kezdőlapra</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-[2rem] font-medium tracking-tight text-ink sm:text-[2.5rem]">
        Ezt értettük belőle.
      </h1>

      <div className="panel p-5 sm:p-7">
        {/* Eredeti mondat */}
        <div className="flex gap-3 rounded-[var(--radius-btn)] bg-lilac/10 p-4">
          <Quote className="h-5 w-5 shrink-0 text-lilac" />
          <p className="text-[15px] leading-relaxed text-ink/90">{parsed.source}</p>
        </div>

        {/* Strukturált mezők */}
        <div className="mt-4 divide-y divide-panel-line">
          <Row icon={Tag} label="Tétel" editing={editing === "title"} onEdit={() => setEditing(editing === "title" ? null : "title")}>
            {editing === "title" ? (
              <input value={fields.title} onChange={(e) => set({ title: e.target.value })} className={inputCls} autoFocus />
            ) : (
              <span className="font-semibold text-ink">{fields.title}</span>
            )}
          </Row>

          <Row icon={CalendarClock} label="Időpont" editing={editing === "datetime"} onEdit={() => setEditing(editing === "datetime" ? null : "datetime")}>
            {editing === "datetime" ? (
              <span className="flex flex-wrap gap-2">
                <input type="date" value={fields.date} onChange={(e) => set({ date: e.target.value })} className={inputCls} autoFocus />
                <input type="time" value={fields.time} onChange={(e) => set({ time: e.target.value })} className={inputCls} />
              </span>
            ) : (
              <span className="font-semibold text-ink">{humanDate(fields.date)}, {fields.time}</span>
            )}
          </Row>

          <Row icon={Bell} label="Értesítések" editing={editing === "notifications"} onEdit={() => setEditing(editing === "notifications" ? null : "notifications")}>
            {editing === "notifications" ? (
              <input value={fields.notifications} onChange={(e) => set({ notifications: e.target.value })} className={inputCls} autoFocus />
            ) : (
              <span className="font-semibold text-ink">{fields.notifications}</span>
            )}
          </Row>

          <Row icon={Globe} label="Időzóna" editing={editing === "timezone"} onEdit={() => setEditing(editing === "timezone" ? null : "timezone")}>
            {editing === "timezone" ? (
              <input value={fields.timezone} onChange={(e) => set({ timezone: e.target.value })} className={inputCls} autoFocus />
            ) : (
              <span className="font-semibold text-ink">{fields.timezone}</span>
            )}
          </Row>
        </div>

        {/* Melléklet (opcionális) */}
        <button type="button" className="mt-4 flex w-full items-center gap-2.5 rounded-[var(--radius-btn)] border border-dashed border-panel-line px-4 py-3.5 text-sm text-muted transition-colors hover:bg-lilac/5">
          <FileText className="h-4 w-4 text-lilac" />
          Fotó vagy PDF hozzáadása (opcionális)
        </button>

        {/* Műveletek */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <Link href="/app" className="flex items-center gap-1.5 text-sm font-semibold text-lilac hover:underline">
            <Pencil className="h-4 w-4" /> Szerkesztem
          </Link>
          <button type="button" onClick={() => setSaved(true)} className="cta flex items-center gap-2 px-6 py-3.5">
            <Check className="h-5 w-5 text-[#05372d]" strokeWidth={2.5} />
            <span className="text-[#05372d]">Rendben, mentsd el</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "rounded-[10px] border border-lilac/40 bg-white px-3 py-1.5 text-[15px] font-semibold text-ink outline-none focus:border-lilac";

function Row({
  icon: Icon,
  label,
  editing,
  onEdit,
  children,
}: {
  icon: typeof Tag;
  label: string;
  editing: boolean;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5 py-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lilac/12 text-lilac">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="w-24 shrink-0 text-muted">{label}:</span>
      <span className="flex-1">{children}</span>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`${label} szerkesztése`}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${editing ? "bg-lilac/15 text-indigo" : "text-lilac hover:bg-lilac/10"}`}
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  );
}
