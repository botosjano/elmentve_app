/**
 * STUB természetes-nyelvű elemző (kártya 19).
 * A valós AI a következő szakaszban jön; addig egy determinisztikus heurisztika
 * állítja elő a strukturált javaslatot, amelyet a felhasználó KÖTELEZŐEN jóváhagy.
 * Az AI/stub SOHA nem hoz létre észrevétlenül határidőt -- csak javasol.
 */
export const TIMEZONE = "Europe/Budapest";

export type ParsedSuggestion = {
  title: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  allDay: boolean;
  notifications: string; // ember-olvasható összefoglaló
  timezone: string;
  source: string; // az eredeti mondat
};

// Szótövek, hogy a ragozott alakokat is felismerjük (szerdán, kedden, hétfőn...).
const WEEKDAY_STEMS: [string, number][] = [
  ["hétf", 1], ["kedd", 2], ["szerd", 3], ["csütört", 4], ["péntek", 5], ["pénteken", 5], ["szombat", 6], ["vasárnap", 0],
];

const HU_MONTHS = [
  "január", "február", "március", "április", "május", "június",
  "július", "augusztus", "szeptember", "október", "november", "december",
];

/** A hétköznapi mondatból cím: az első értelmes kulcsszó vagy egy rövid kivonat. */
function guessTitle(text: string): string {
  const t = text.toLowerCase();
  const map: [RegExp, string][] = [
    [/olajcser/, "Olajcsere"],
    [/műszaki|muszaki|vizsga/, "Műszaki vizsga"],
    [/orvos|fogorvos|doktor/, "Orvosi időpont"],
    [/biztosít|biztosit/, "Biztosítás évfordulója"],
    [/okmány|okmany|igazolvány|jogosítvány|útlevél|utlevel/, "Okmány lejárata"],
    [/garancia|jótállás|jotallas|nyugta|számla|szamla/, "Vásárlás és garancia"],
    [/időpont|idopont/, "Időpont"],
  ];
  for (const [re, label] of map) if (re.test(t)) return label;
  const firstSentence = text.split(/[.,\n]/)[0].trim();
  return firstSentence.length > 2 && firstSentence.length <= 48
    ? firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1)
    : "Emlékeztető";
}

/** A következő adott hétköznap dátuma (a "jövő" prefix egy hetet told). */
function nextWeekday(base: Date, dow: number, nextWeek: boolean): Date {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  let diff = (dow - d.getDay() + 7) % 7;
  if (diff === 0) diff = 7; // a mai napot ne vegyük
  if (nextWeek) diff += 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Ember-olvasható dátum: "2026. augusztus 5." */
export function humanDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${y}. ${HU_MONTHS[m - 1]} ${d}.`;
}

export function parseInput(text: string, now: Date = new Date()): ParsedSuggestion {
  const t = text.toLowerCase();
  const nextWeek = /jövő|jovo|következő|kovetkezo/.test(t);

  // Dátum: hétköznap-név, egyébként +7 nap.
  let date: Date | null = null;
  for (const [stem, dow] of WEEKDAY_STEMS) {
    if (t.includes(stem)) { date = nextWeekday(now, dow, nextWeek); break; }
  }
  if (!date) {
    date = new Date(now);
    date.setDate(date.getDate() + 7);
    date.setHours(0, 0, 0, 0);
  }

  // Idő: "HH:MM" vagy "H órakor"; egyébként egész napos.
  const hm = t.match(/(\d{1,2})[:.](\d{2})/);
  const hourOnly = t.match(/(\d{1,2})\s*órakor/);
  let time = "09:00";
  let allDay = true;
  if (hm) { time = `${hm[1].padStart(2, "0")}:${hm[2]}`; allDay = false; }
  else if (hourOnly) { time = `${hourOnly[1].padStart(2, "0")}:00`; allDay = false; }

  return {
    title: guessTitle(text),
    date: fmt(date),
    time,
    allDay,
    notifications: "előző nap 18:00 · 2 órával előtte",
    timezone: TIMEZONE,
    source: text.trim(),
  };
}
