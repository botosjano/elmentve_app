/**
 * Demó adatok (kártya 19-20). A valós adatok a Supabase-ből jönnek később;
 * ez a UI-hoz szükséges illusztráció. Az ITEMS a közös forrás, ebből
 * származik a kezdőlap "Közelgő"/"Legutóbb" listája és a részletnézet is.
 */
export type IconKey = "car" | "id" | "appointment" | "washer" | "passport" | "house" | "oil" | "contract";
export type Category = "Garancia" | "Határidő" | "Hova tettem?";

export type HistoryEntry = { date: string; offset: string; status: string; future?: boolean };

export type Item = {
  id: string;
  title: string;
  icon: IconKey;
  category: Category;
  tint: string; // thumbnail háttér-osztály
  meta: string; // lista meta-sor
  metaIcon: "calendar" | "bell" | "location" | "file";
  due?: string; // "Közelgő" listához
  soon?: boolean;
  status?: string; // pl. "Aktívan figyeljük"
  purchaseDate?: string;
  warrantyEnd?: string;
  location?: string;
  notify?: string;
  docLabel?: string;
  history?: HistoryEntry[];
};

export const ITEMS: Item[] = [
  {
    id: "r1", title: "Műszaki vizsga", icon: "car", category: "Határidő", tint: "bg-lilac/12",
    meta: "Lejárat · 2026. augusztus 5.", metaIcon: "calendar", due: "12 nap múlva", soon: true,
    status: "Aktívan figyeljük", warrantyEnd: "2026. augusztus 5.", notify: "30 nappal előtte · 7 nappal előtte",
    history: [{ date: "2026. július 6.", offset: "30 nappal előtte", status: "Értesítés ütemezve", future: true }],
  },
  {
    id: "r2", title: "Személyi igazolvány", icon: "id", category: "Határidő", tint: "bg-lilac/12",
    meta: "Lejárat · 2026. szeptember 4.", metaIcon: "calendar", due: "42 nap múlva",
    status: "Aktívan figyeljük", warrantyEnd: "2026. szeptember 4.", notify: "30 nappal előtte",
  },
  {
    id: "r3", title: "Fogorvosi időpont", icon: "appointment", category: "Határidő", tint: "bg-lilac/12",
    meta: "Időpont · szerda, 10:00", metaIcon: "calendar", due: "szerda, 10:00",
    status: "Aktívan figyeljük", notify: "előző nap 18:00 · 2 órával előtte",
  },
  {
    id: "it1", title: "Bosch mosógép garancia", icon: "washer", category: "Garancia", tint: "bg-lilac/12",
    meta: "Garancia · 2027. március 14.", metaIcon: "calendar",
    status: "Aktívan figyeljük", purchaseDate: "2025. március 14.", warrantyEnd: "2027. március 14.",
    location: "Kék dosszié, nappali szekrény", notify: "30 nappal előtte · 7 nappal előtte", docLabel: "Nyugta",
    history: [
      { date: "2027. február 12.", offset: "30 nappal előtte", status: "Értesítés ütemezve", future: true },
      { date: "2027. március 7.", offset: "7 nappal előtte", status: "Értesítés ütemezve", future: true },
    ],
  },
  {
    id: "it2", title: "Útlevél helye", icon: "passport", category: "Hova tettem?", tint: "bg-mint/10",
    meta: "Nagy bőrönd · belső zseb", metaIcon: "location",
    status: "Aktívan figyeljük", location: "Nagy bőrönd, belső zseb",
  },
  {
    id: "it3", title: "Lakásbiztosítás", icon: "house", category: "Garancia", tint: "bg-lilac/12",
    meta: "Forduló: szeptember 12.", metaIcon: "calendar",
    status: "Aktívan figyeljük", warrantyEnd: "2026. szeptember 12.", notify: "14 nappal előtte", docLabel: "PDF",
  },
  {
    id: "it4", title: "Olajcsere", icon: "oil", category: "Határidő", tint: "bg-coral/10",
    meta: "Emlékeztető: augusztus 5.", metaIcon: "bell",
    status: "Aktívan figyeljük", warrantyEnd: "2026. augusztus 5.", notify: "előző nap 18:00 · 2 órával előtte",
  },
  {
    id: "it5", title: "Albérleti szerződés", icon: "contract", category: "Hova tettem?", tint: "bg-mint/10",
    meta: "PDF · 2026. december 31.", metaIcon: "file",
    status: "Aktívan figyeljük", location: "Kék dosszié", docLabel: "PDF",
  },
];

export const getItem = (id: string) => ITEMS.find((i) => i.id === id);

/** Kezdőlap: közelgő határidők (a due mezővel rendelkezők). */
export const UPCOMING = ITEMS.filter((i) => i.due).slice(0, 3);

/** Kezdőlap: legutóbb elmentett tételek. */
export const SAVED = [ITEMS[3], ITEMS[4], ITEMS[7]]; // Bosch, Útlevél, Albérleti
