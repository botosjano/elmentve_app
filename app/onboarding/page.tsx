"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Car, IdCard, ShoppingBag, Check } from "lucide-react";

const PLACEHOLDER = "Jövő kedden 14:30-kor időpontom van. Szólj előtte egy nappal és két órával.";

const TEMPLATES = [
  { icon: Car, label: "Autó műszaki vizsga", q: "Autó műszaki vizsga lejárata" },
  { icon: IdCard, label: "Okmány lejárata", q: "Okmány lejárata" },
  { icon: ShoppingBag, label: "Vásárlás és garancia", q: "Vásárlás és garancia, jótállási jegy" },
];

/** 00-onboarding: első belépés, természetes nyelvű első mentés vagy három sablon. */
export default function Onboarding() {
  const router = useRouter();
  const [text, setText] = useState("");

  const go = (q: string) => router.push(`/app/megerosites?q=${encodeURIComponent(q)}`);

  return (
    <div className="relative flex flex-1 flex-col">
      <header className="mx-auto w-full max-w-content px-5 py-6 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <Image src="/brand/mark-tile.png" alt="" width={40} height={40} className="h-9 w-9 rounded-[11px] shadow-[0_8px_20px_-10px_rgba(107,94,235,0.7)]" priority />
          <Image src="/brand/wordmark.svg" alt="Elmentve" width={120} height={28} className="h-6 w-auto" priority />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
        <h1 className="text-center text-[2.25rem] font-semibold tracking-tight text-ink sm:text-[3rem]">
          Mit mentsünk el?
        </h1>
        <p className="mx-auto mt-3 max-w-md text-center text-[15px] leading-relaxed text-muted sm:text-lg">
          Írd le hétköznapi nyelven, mi az, amit szeretnél megőrizni vagy amiről időben szóljunk.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder={PLACEHOLDER}
          className="mt-8 w-full resize-none rounded-[var(--radius-panel)] border border-lilac/50 bg-white px-5 py-4 text-[17px] leading-relaxed text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-lilac"
        />

        <button
          type="button"
          onClick={() => go(text.trim() || PLACEHOLDER)}
          className="cta mt-4 flex w-full items-center justify-center gap-2 py-4 text-[15px]"
        >
          <span className="text-[#05372d]">Folytatás</span>
          <ArrowRight className="h-5 w-5 text-[#05372d]" />
        </button>

        {/* Sablonok */}
        <div className="mt-10 flex items-center gap-4 text-sm font-semibold text-muted">
          <span className="h-px flex-1 bg-panel-line" />
          Vagy válassz sablont:
          <span className="h-px flex-1 bg-panel-line" />
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
          {TEMPLATES.map(({ icon: Icon, label, q }) => (
            <button
              key={label}
              type="button"
              onClick={() => go(q)}
              className="flex flex-col items-center gap-3 rounded-[var(--radius-panel)] px-2 py-4 text-center transition-colors hover:bg-lilac/8"
            >
              <span className="relative">
                <Icon className="h-9 w-9 text-lilac" strokeWidth={1.75} />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-mint text-white">
                  <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                </span>
              </span>
              <span className="text-[13px] font-semibold text-ink sm:text-sm">{label}</span>
            </button>
          ))}
        </div>

        <Link href="/app" className="mx-auto mt-8 text-sm font-semibold text-lilac hover:underline">
          Inkább kitöltöm kézzel
        </Link>
      </main>
    </div>
  );
}
