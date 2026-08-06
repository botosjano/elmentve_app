import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { CookieSettingsLink } from "@/components/CookieSettingsLink";
import { LEGAL_INFO } from "@/lib/legal";

export const metadata: Metadata = { title: "Adatkezelési tájékoztató" };

/**
 * Adatkezelési tájékoztató -- SCAFFOLD (kártya: cookie consent + jogi oldalak).
 * A szekciók szerkezete a végleges dokumentum váza; a valós jogi szöveget
 * a cégtulajdonos/jogász adja majd meg. Az "Adatkezelő adatai" szekció a
 * lib/legal.ts központi konfigurációból olvas, hogy egy helyen legyen
 * karbantartható -- a többi szekció egyelőre placeholder.
 */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-2 text-[14px] leading-relaxed text-muted">{children}</div>
    </section>
  );
}

function Placeholder() {
  return (
    <p className="rounded-[var(--radius-btn)] border border-dashed border-lilac/40 bg-lilac/5 px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-lilac">
      SZÖVEG IDE KERÜL
    </p>
  );
}

export default function AdatvedelemPage() {
  return (
    <div className="mx-auto flex w-full max-w-content flex-1 flex-col px-5 pb-20 pt-8 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-ink/75 transition-colors hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Vissza
        </Link>
        <Logo />
      </header>

      <main id="main-content" className="mx-auto mt-10 w-full max-w-2xl">
        <h1 className="text-[1.85rem] font-medium tracking-tight text-ink sm:text-[2.25rem]">
          Adatkezelési tájékoztató
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Ez az oldal jelenleg váz (scaffold) -- a végleges, jogilag ellenőrzött szöveg
          hamarosan elkészül. Addig is átlátszóak akarunk lenni: az alábbi szekciók
          mutatják, mire fog kiterjedni a tájékoztató.
        </p>

        <div className="mt-8 flex flex-col gap-5">
          <Section title="Az adatkezelő adatai">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[auto_1fr]">
              <dt className="font-semibold text-ink">Cégnév</dt>
              <dd>{LEGAL_INFO.cegNev}</dd>
              <dt className="font-semibold text-ink">Székhely</dt>
              <dd>{LEGAL_INFO.szekhely}</dd>
              <dt className="font-semibold text-ink">Cégjegyzékszám</dt>
              <dd>{LEGAL_INFO.cegjegyzekszam}</dd>
              <dt className="font-semibold text-ink">Adószám</dt>
              <dd>{LEGAL_INFO.adoszam}</dd>
              <dt className="font-semibold text-ink">Email</dt>
              <dd>{LEGAL_INFO.email}</dd>
              <dt className="font-semibold text-ink">Telefon</dt>
              <dd>{LEGAL_INFO.telefon}</dd>
              <dt className="font-semibold text-ink">Adatvédelmi kapcsolattartó</dt>
              <dd>{LEGAL_INFO.adatvedelmiKapcsolattarto}</dd>
            </dl>
            <p className="mt-3 text-[12px] text-lilac">
              Ezek az adatok jelenleg placeholder értékek (lásd lib/legal.ts) -- a valós
              céges adatokkal frissülnek, mielőtt éles környezetbe kerül az oldal.
            </p>
          </Section>

          <Section title="Milyen adatot kérünk">
            <Placeholder />
          </Section>

          <Section title="Milyen célból kezeljük az adatokat">
            <Placeholder />
          </Section>

          <Section title="Az adatkezelés jogalapja">
            <Placeholder />
          </Section>

          <Section title="Meddig tároljuk az adatokat">
            <Placeholder />
          </Section>

          <Section title="Kinek adjuk át az adatokat (adatfeldolgozók)">
            <Placeholder />
          </Section>

          <Section title="Az érintett jogai">
            <Placeholder />
          </Section>

          <Section title="Panasz benyújtása (NAIH)">
            <Placeholder />
          </Section>

          <Section title="Sütik (cookie-k)">
            <p>
              A süti-használatot és a hozzájárulásod bármikor módosíthatod a lenti
              gombbal.
            </p>
            <CookieSettingsLink className="mt-3 inline-flex rounded-[var(--radius-btn)] border border-lilac/40 bg-white px-4 py-2.5 text-sm font-semibold text-indigo transition-colors hover:bg-lilac/5" />
          </Section>
        </div>
      </main>
    </div>
  );
}
