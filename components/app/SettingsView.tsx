"use client";

import { useState } from "react";
import {
  User, Globe, Clock, Moon, Mail, MessageSquare, Crown, Sparkles, Check,
  Layers, Database, ShieldCheck, Upload, Trash2, ChevronDown,
} from "lucide-react";
import { PROFILE, PLAN } from "@/lib/mockData";

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? "bg-indigo" : "bg-lilac/25"}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-6" : "left-1"}`} />
    </button>
  );
}

function Select({ value, options }: { value: string; options: string[] }) {
  const [v, setV] = useState(value);
  return (
    <span className="relative block max-w-full">
      <select
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="w-full max-w-full appearance-none rounded-[var(--radius-btn)] border border-panel-line bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-ink outline-none focus:border-lilac"
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </span>
  );
}

function SettingRow({ icon: Icon, title, desc, control }: { icon: typeof Globe; title: string; desc: string; control: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 py-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lilac/12 text-lilac">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      <div className="min-w-40 flex-1 basis-0">
        <p className="font-semibold text-ink">{title}</p>
        <p className="text-[13px] text-muted">{desc}</p>
      </div>
      <span className="ml-auto max-w-full">{control}</span>
    </div>
  );
}

export function SettingsView() {
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);

  return (
    <div>
      <h1 className="mb-6 text-[2rem] font-medium tracking-tight text-ink sm:text-[2.5rem]">Beállítások</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profil és értesítések */}
        <div className="panel min-w-0 p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <User className="h-5 w-5 text-lilac" />
            <h2 className="text-lg font-semibold text-ink">Profil és értesítések</h2>
          </div>

          <div className="flex items-center gap-3 rounded-[var(--radius-btn)] bg-lilac/8 p-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo text-lg font-semibold text-white">{PROFILE.initials}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{PROFILE.name}</p>
              <p className="truncate text-[13px] text-muted">{PROFILE.email}</p>
            </div>
            <button type="button" className="rounded-[var(--radius-btn)] border border-lilac/40 bg-white px-3.5 py-2 text-sm font-semibold text-indigo transition-colors hover:bg-lilac/5">
              Szerkesztés
            </button>
          </div>

          <div className="mt-2 divide-y divide-panel-line">
            <SettingRow icon={Globe} title="Időzóna" desc="Az időzóna beállítja az értesítések időzítését." control={<Select value={PROFILE.timezone} options={["Europe/Budapest", "Europe/London", "Europe/Bucharest"]} />} />
            <SettingRow icon={Clock} title="Alapértelmezett értesítési időpont" desc="Ekkor küldjük a napi összefoglalót." control={<Select value={PROFILE.defaultTime} options={["07:00", "08:00", "09:00", "18:00"]} />} />
            <SettingRow icon={Moon} title="Csendes időszak" desc="Ekkor nem küldünk értesítéseket." control={<Select value={PROFILE.quietHours} options={["21:00 – 08:00", "22:00 – 07:00", "Nincs"]} />} />
          </div>

          <div className="mt-5 border-t border-panel-line pt-5">
            <p className="font-semibold text-ink">Értesítési csatornák</p>
            <p className="mb-2 text-[13px] text-muted">Válaszd ki, hol szeretnél értesítéseket kapni.</p>
            <div className="divide-y divide-panel-line">
              <SettingRow icon={Mail} title="Email" desc="Értesítések fogadása e-mailben." control={<Toggle on={email} onChange={() => setEmail((v) => !v)} />} />
              <SettingRow
                icon={MessageSquare}
                title="SMS (Pro)"
                desc="Értesítések fogadása SMS-ben."
                control={
                  <span className="flex items-center gap-2">
                    <span className="rounded-full bg-lilac/15 px-2 py-0.5 text-[12px] font-semibold text-indigo">Pro</span>
                    <Toggle on={sms} onChange={() => setSms((v) => !v)} />
                  </span>
                }
              />
            </div>
          </div>
        </div>

        {/* Csomag és tárhely */}
        <div className="panel min-w-0 p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <Crown className="h-5 w-5 text-lilac" />
            <h2 className="text-lg font-semibold text-ink">Csomag és tárhely</h2>
          </div>

          <div className="rounded-[var(--radius-btn)] bg-mint/10 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mint/20 text-mint"><Sparkles className="h-5 w-5" /></span>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-ink">7 napos Pro próba aktív</p>
                  <span className="rounded-full bg-mint/20 px-2.5 py-0.5 text-[12px] font-semibold text-mint-ink">{PLAN.trialDaysLeft} nap</span>
                </div>
                <p className="text-[13px] text-muted">Ennyi idő van hátra a próbaidőszakból.</p>
              </div>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm text-ink">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-mint-ink" /> Minden Pro funkció elérhető</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-mint-ink" /> Kötelezettségmentes próba – bármikor lemondható</li>
            </ul>
          </div>

          <div className="mt-3 divide-y divide-panel-line">
            <SettingRow icon={Layers} title="Aktív tételek" desc="Ennyi mentésed van használatban." control={<span className="rounded-full bg-lilac/12 px-3 py-1.5 text-sm font-semibold text-indigo">{PLAN.activeItems} / {PLAN.activeLimit}</span>} />
            <SettingRow icon={Database} title="Tárhely" desc="Ennyi tárhelyet használsz." control={<span className="text-sm font-semibold text-indigo">{PLAN.storageUsedMb} MB / {PLAN.storageLimitMb} MB</span>} />
          </div>

          <button type="button" className="cta mt-5 flex w-full items-center justify-center gap-2 py-3.5">
            <Crown className="h-5 w-5 text-[#05372d]" /> <span className="text-[#05372d]">Pro-ra váltok</span>
          </button>
          <p className="mt-3 text-center text-[13px] text-muted">A próbaidőszak végén Pro előfizetéssé alakul át.</p>
        </div>
      </div>

      {/* Adatvédelem és fiók */}
      <div className="panel mt-6 p-5 sm:p-6">
        <div className="mb-2 flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-lilac" />
          <h2 className="text-lg font-semibold text-ink">Adatvédelem és fiók</h2>
        </div>
        <div className="divide-y divide-panel-line">
          <div className="flex items-center gap-3.5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lilac/12 text-lilac"><Upload className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">Adatok exportálása</p>
              <p className="text-[13px] text-muted">Töltsd le adataidat egy JSON fájlban.</p>
            </div>
            <button type="button" className="rounded-[var(--radius-btn)] border border-lilac/40 bg-white px-4 py-2.5 text-sm font-semibold text-indigo transition-colors hover:bg-lilac/5">Exportálás</button>
          </div>
          <div className="flex items-center gap-3.5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral/12 text-coral"><Trash2 className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">Fiók törlése</p>
              <p className="text-[13px] text-muted">A fiókod és minden hozzá tartozó adat véglegesen törlődik.</p>
            </div>
            <button type="button" className="rounded-[var(--radius-btn)] border border-coral/50 bg-white px-4 py-2.5 text-sm font-semibold text-coral transition-colors hover:bg-coral/5">Fiók törlése</button>
          </div>
        </div>
      </div>
    </div>
  );
}
