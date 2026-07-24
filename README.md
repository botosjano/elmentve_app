# Elmentve

Hétköznapi biztonsági háló: **lejáratfigyelő** (műszaki vizsga, okmány, biztosítás, előfizetés)
és **garanciaszéf** (nyugta, számla, jótállási jegy). Fotózd le, ellenőrizd, mi megőrizzük és
időben szólunk.

Specifikáció: `docs/elmentve-mvp-koncepcio.md` · Visual kit: `docs/elmentve-visual-kit/`
(a marveen repóban).

## Stack

- **Next.js 16 PWA** (App Router, Turbopack) a Vercelen
- **Tailwind v4** design token rendszer (`app/globals.css`, handoff v1 alapján)
- **Supabase** (Auth + Postgres + privát Storage) — *következő szakasz*
- **Cloudflare Worker Cron** az emlékeztető-motorhoz + kézbesítési napló/heartbeat — *következő szakasz*
- **GHL** kizárólag CRM-életciklus (outbox) — *következő szakasz*

## Design token rendszer

| Szerep | Token | Érték |
| --- | --- | --- |
| Oldalháttér | `bg` | `#F7F5FF` |
| Fő szöveg | `ink` | `#18245D` |
| Másodlagos lila | `lilac` | `#8A7CF6` |
| Menta CTA / siker | `mint` | `#22D6B2` |
| Panel | `panel` | `rgba(255,255,255,.76)` |

Betűtípus: **Manrope** (latin-ext, magyar ő/ű). Panel sugár 22px, gomb 16px.
Nincs dark mode, admin-hangulat vagy dashboard-érzés.

## Fejlesztés

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

## Animáció-stack (flotta-szabvány)

Minden webes projekt alapértelmezett animáció/scroll-stackje: **saját könnyű `Reveal`
(IntersectionObserver, 0 külső lib) + `lenis`** (Janos döntése, 2026-07-24) — a
buttery-smooth momentum-görgetés + elemenként késleltetett (staggered) fade+slide-up
appear-animációk reprodukálására. **NEM `framer-motion`** (a saját Reveal kevesebb JS,
jobb Lighthouse landingen).

- Új szekció/feature: **ezzel épül** (Lenis smooth-scroll + IntersectionObserver-alapú
  Reveal, staggered CSS `transition-delay`-jel).
- `prefers-reduced-motion` kötelező tisztelet (Lenis + reveal kikapcs).
- A kész UI retrofit nem sürgős/blokkoló.

## Állapot

- [x] Kártya 18 — projekt scaffold + design token rendszer, PWA alap, brand assetek
- [ ] Kártya 19 — onboarding + természetes nyelvű mentés + jóváhagyási kártya
- [ ] Kártya 20-25 — tételek, emlékeztető-motor, beállítások/Pro, szabálytudás, kézbesítés
