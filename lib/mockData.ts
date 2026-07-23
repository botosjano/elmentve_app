/**
 * Demó adatok a kezdőképernyőhöz (kártya 19). A valós adatok a Supabase-ből
 * jönnek a következő szakaszban; ez csak a UI-hoz szükséges illusztráció.
 */
export type IconKey = "car" | "id" | "appointment" | "warranty" | "doc" | "contract";

export type Upcoming = { id: string; title: string; due: string; icon: IconKey; soon?: boolean };
export type SavedItem = { id: string; title: string; image: string; hint?: string };

export const UPCOMING: Upcoming[] = [
  { id: "u1", title: "Műszaki vizsga", due: "12 nap múlva", icon: "car", soon: true },
  { id: "u2", title: "Személyi igazolvány", due: "42 nap múlva", icon: "id" },
  { id: "u3", title: "Fogorvosi időpont", due: "szerda, 10:00", icon: "appointment" },
];

export const SAVED: SavedItem[] = [
  { id: "s1", title: "Bosch mosógép garancia", image: "/brand/key-visual.png", hint: "Jótállási jegy" },
  { id: "s2", title: "Útlevél helye", image: "/brand/key-visual.png", hint: "A nagy bőrönd belső zsebében" },
  { id: "s3", title: "Albérleti szerződés", image: "/brand/key-visual.png", hint: "Kék dosszié" },
];
