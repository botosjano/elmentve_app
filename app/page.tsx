import Image from "next/image";
import Link from "next/link";
import { Mic, ArrowRight, MessageSquareText, ShieldCheck, BellRing } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { CookieSettingsLink } from "@/components/CookieSettingsLink";
import { Reveal } from "@/components/ui/Reveal";

const HOW_IT_WORKS = [
  {
    icon: MessageSquareText,
    title: "1. Írd le vagy fotózd le",
    desc: "Egy mondatban leírod, vagy lefotózod a nyugtát, okmányt, jótállási jegyet.",
  },
  {
    icon: ShieldCheck,
    title: "2. Ellenőrzöd, mi jóváhagyjuk",
    desc: "A javasolt dátumot és emlékeztetőt te hagyod jóvá -- mi soha nem döntünk helyetted.",
  },
  {
    icon: BellRing,
    title: "3. Időben szólunk",
    desc: "Email, SMS vagy chat -- ott értesítünk, ahol biztosan látod, mielőtt lejár a határidő.",
  },
];

/**
 * Scaffold-kezdőlap: a design token rendszert és a márkát demonstrálja
 * (a végleges 00-onboarding / 01-home képernyők a design-targetek alapján
 * a következő kártyában készülnek).
 */
export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col">
      {/* Teljes 3D key visual háttér, lassú Ken Burns zoommal + világos scrim
          az olvashatóságért. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <Image src="/brand/key-visual.png" alt="" fill priority className="kenburns object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(247,245,255,0.70)_0%,rgba(247,245,255,0.58)_45%,rgba(247,245,255,0.86)_100%)]" />
      </div>

      <header className="mx-auto flex w-full max-w-content items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <Button href="/app" variant="secondary" className="px-4 py-2 text-sm">
          Belépés
        </Button>
      </header>

      <main id="main-content" className="mx-auto flex w-full max-w-content flex-1 flex-col items-center px-5 pb-16 pt-8 text-center sm:px-8 sm:pt-16">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-lilac">
          Hétköznapi biztonsági háló
        </p>
        <h1 className="mt-4 max-w-2xl text-[2rem] font-medium leading-[1.15] tracking-tight text-ink sm:text-[2.75rem]">
          Fotózd le. Ellenőrizd. Mi megőrizzük, és időben szólunk.
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted sm:text-lg">
          Lejáratfigyelő és garanciaszéf: műszaki vizsga, okmány, biztosítás, nyugta és jótállás
          egy helyen. Írd le egy mondatban, mit szeretnél megőrizni.
        </p>

        {/* A signature természetes-nyelvű mentőmező (előnézet). */}
        <div className="panel mt-10 w-full max-w-xl p-5 text-left">
          <label htmlFor="save" className="text-sm font-semibold text-ink">
            Mit mentsünk el?
          </label>
          <p className="mt-1 text-[13px] text-muted">
            Írd le, mit szeretnél elmenteni, vagy miről kérsz emlékeztetőt.
          </p>
          <div className="mt-3 flex items-end gap-2">
            <textarea
              id="save"
              rows={2}
              disabled
              placeholder="Például: Jövő kedden 14:30-kor időpontom van. Szólj előtte egy nappal és két órával."
              className="min-h-11 flex-1 resize-none rounded-[var(--radius-btn)] border border-panel-line bg-white/70 px-4 py-3 text-sm text-ink outline-none placeholder:text-muted/70"
            />
            <button
              type="button"
              disabled
              aria-label="Diktálás"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-btn)] border border-panel-line bg-white/70 text-lilac"
            >
              <Mic className="h-5 w-5" />
            </button>
          </div>
          <Button href="/onboarding" className="mt-4 w-full">
            Kezdjük el <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <p className="mt-6 text-[13px] text-muted">
          Bankkártya nélkül. 7 nap teljes Pro, utána ingyenes csomag.
        </p>

        {/* Hogyan működik */}
        <section className="mt-20 w-full">
          <h2 className="text-[1.5rem] font-medium tracking-tight text-ink sm:text-[1.85rem]">
            Hogyan működik?
          </h2>
          <Reveal className="mt-8 grid gap-5 sm:grid-cols-3">
            {HOW_IT_WORKS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="panel min-w-0 p-5 text-left sm:p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-lilac/12 text-lilac">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <p className="mt-4 font-semibold text-ink">{title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{desc}</p>
              </div>
            ))}
          </Reveal>
        </section>
      </main>

      <footer className="mx-auto mt-12 w-full max-w-content px-5 py-8 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-3 border-t border-panel-line pt-6 text-center sm:flex-row sm:text-left">
          <p className="text-[13px] text-muted">© {new Date().getFullYear()} Elmentve. Minden jog fenntartva.</p>
          <div className="flex items-center gap-4 text-[13px] text-muted">
            <span>Impresszum</span>
            <Link href="/adatvedelem" className="transition-colors hover:text-ink">
              Adatvédelem
            </Link>
            <CookieSettingsLink className="transition-colors hover:text-ink" />
          </div>
        </div>
      </footer>
    </div>
  );
}
