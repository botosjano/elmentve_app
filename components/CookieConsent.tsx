"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";
import {
  COOKIE_CATEGORY_LABELS,
  COOKIE_CATEGORY_ORDER,
  OPEN_COOKIE_SETTINGS_EVENT,
  acceptAll,
  getConsentServerSnapshot,
  getConsentSnapshot,
  getDefaultChoices,
  rejectAll,
  subscribeConsent,
  writeConsent,
  type CookieCategory,
  type ConsentChoices,
} from "@/lib/consent";

function CategoryToggle({
  category,
  checked,
  onChange,
}: {
  category: CookieCategory;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const { title, desc, locked } = COOKIE_CATEGORY_LABELS[category];
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={locked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          checked ? "bg-indigo" : "bg-lilac/25"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

/**
 * Cookie-consent: banner + részletes beállító panel (kártya: cookie consent
 * scaffold). Az "Elfogadom" és "Elutasítom" gomb szándékosan egyenrangú --
 * jogi elvárás, hogy az elutasítás ne legyen nehezebben elérhető.
 *
 * A mentett döntést useSyncExternalStore-ral olvassuk a localStorage-ból
 * (lib/consent.ts) -- ez SSR-biztos (getServerSnapshot === null, tehát a
 * szerver-render sosem mutatja a bannert) és automatikusan újrarenderel,
 * amikor a döntés bárhonnan (másik fül, footer-link, mentés) megváltozik,
 * setState-et effektus-törzsben soha nem hívunk közvetlenül.
 *
 * A beállító panel bárhonnan újranyitható az OPEN_COOKIE_SETTINGS_EVENT
 * eseménnyel (lásd lib/consent.ts openCookieSettings() -- pl. lábléc
 * "Süti-beállítások" link).
 */
export function CookieConsent() {
  const stored = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getConsentServerSnapshot);
  const decided = stored !== null;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<ConsentChoices>(() => stored ?? getDefaultChoices());

  useEffect(() => {
    const onOpenSettings = () => {
      setDraft(stored ?? getDefaultChoices());
      setSettingsOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpenSettings);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpenSettings);
  }, [stored]);

  const bannerVisible = !decided;
  if (!bannerVisible && !settingsOpen) return null;

  return (
    <>
      {settingsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-settings-title"
          className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/30 backdrop-blur-sm sm:items-center sm:p-5"
        >
          <div className="panel relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-b-none bg-white/95 p-5 sm:rounded-b-[var(--radius-panel)] sm:p-6">
            <button
              type="button"
              aria-label="Bezárás"
              onClick={() => setSettingsOpen(false)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-lilac/10 hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 pr-10">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lilac/12 text-lilac">
                <Cookie className="h-5 w-5" />
              </span>
              <h2 id="cookie-settings-title" className="text-lg font-semibold text-ink">
                Süti-beállítások
              </h2>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Válaszd ki, mely süti-kategóriákat engedélyezed. A szükséges sütiket a
              működés miatt nem lehet kikapcsolni. Bármikor módosíthatod ezt a
              beállítást itt, vagy a lábléc &bdquo;Süti-beállítások&rdquo; linkjén
              keresztül.
            </p>

            <div className="mt-2 divide-y divide-panel-line">
              {COOKIE_CATEGORY_ORDER.map((category) => (
                <CategoryToggle
                  key={category}
                  category={category}
                  checked={draft[category]}
                  onChange={(v) => setDraft((prev) => ({ ...prev, [category]: v }))}
                />
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  writeConsent(draft);
                  setSettingsOpen(false);
                }}
                className="cta order-1 flex-1 py-3 text-center sm:order-2"
              >
                Beállítások mentése
              </button>
              <button
                type="button"
                onClick={() => {
                  const c = rejectAll();
                  setDraft(c);
                  setSettingsOpen(false);
                }}
                className="order-2 flex-1 rounded-[var(--radius-btn)] border border-lilac/40 bg-white px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-lilac/5 sm:order-1"
              >
                Csak a szükséges
              </button>
            </div>

            <p className="mt-4 text-center text-[12px] text-muted">
              Részletek:{" "}
              <Link href="/adatvedelem" className="font-semibold text-indigo underline underline-offset-2">
                Adatkezelési tájékoztató
              </Link>
            </p>
          </div>
        </div>
      )}

      {bannerVisible && !settingsOpen && (
        <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:pb-5">
          <div className="panel mx-auto flex max-w-content flex-col gap-3.5 bg-white/95 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
            <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lilac/12 text-lilac sm:flex">
              <Cookie className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">Sütiket használunk</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                A szükséges sütik mellett -- ha hozzájárulsz -- analitikai és marketing
                sütiket is használunk, hogy jobbá tegyük az Elmentvét. Bővebben az{" "}
                <Link href="/adatvedelem" className="font-semibold text-indigo underline underline-offset-2">
                  adatkezelési tájékoztatóban
                </Link>
                .
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
              <button
                type="button"
                onClick={() => {
                  setDraft(stored ?? getDefaultChoices());
                  setSettingsOpen(true);
                }}
                className="col-span-2 rounded-[var(--radius-btn)] px-4 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-lilac/10 hover:text-ink sm:col-span-1"
              >
                Beállítások
              </button>
              <button type="button" onClick={() => rejectAll()} className="rounded-[var(--radius-btn)] border border-lilac/40 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-lilac/5">
                Elutasítom
              </button>
              <button type="button" onClick={() => acceptAll()} className="cta px-4 py-2.5 text-center text-sm">
                Elfogadom
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
