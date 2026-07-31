/**
 * Cookie/süti-consent állapotkezelés (kártya: cookie consent scaffold).
 * localStorage-ban tárol, kategóriánként (szükséges / analitika / marketing).
 * A "szükséges" kategória mindig aktív -- ez nélkül az app nem működne, ezt
 * nem lehet kikapcsolni (ahogy a GDPR/eIDAS gyakorlat is elvárja).
 *
 * Bármilyen NEM-szükséges script/pixel (analitika, hirdetés-mérés) csak azután
 * inicializálódhat, hogy a felhasználó a megfelelő kategóriát elfogadta --
 * erre szolgál a hasConsent(category) helper. Jelenleg az appban nincs ilyen
 * script bekötve (nincs GA/Meta pixel), de ha lesz, a betöltő kódnak ELŐBB
 * hasConsent()-et kell hívnia.
 */

export type CookieCategory = "szukseges" | "analitika" | "marketing";

export type ConsentChoices = Record<CookieCategory, boolean>;

type StoredConsent = {
  version: number;
  choices: ConsentChoices;
  decidedAt: string;
};

const STORAGE_KEY = "elmentve.cookie-consent";
const STORAGE_VERSION = 1;

/** Amikor a választás megváltozik (mentés/elfogadás/elutasítás után). */
export const COOKIE_CONSENT_EVENT = "elmentve:cookie-consent-changed";
/** Bárhonnan kiváltható, hogy a beállító panel újra megnyíljon (pl. lábléc-link). */
export const OPEN_COOKIE_SETTINGS_EVENT = "elmentve:open-cookie-settings";

export const COOKIE_CATEGORY_ORDER: CookieCategory[] = ["szukseges", "analitika", "marketing"];

export const COOKIE_CATEGORY_LABELS: Record<
  CookieCategory,
  { title: string; desc: string; locked?: boolean }
> = {
  szukseges: {
    title: "Szükséges",
    desc: "A bejelentkezéshez és az app alapműködéséhez elengedhetetlen sütik. Ezek nélkül az Elmentve nem használható, ezért nem kapcsolhatók ki.",
    locked: true,
  },
  analitika: {
    title: "Analitika",
    desc: "Segít megérteni, hogyan használod az appot, hogy javíthassunk rajta. Csak akkor fut, ha engedélyezed.",
  },
  marketing: {
    title: "Marketing",
    desc: "Hirdetések személyre szabásához és mérésükhöz. Csak akkor fut, ha engedélyezed.",
  },
};

const DEFAULT_CHOICES: ConsentChoices = {
  szukseges: true,
  analitika: false,
  marketing: false,
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function getDefaultChoices(): ConsentChoices {
  return { ...DEFAULT_CHOICES };
}

/** A ténylegesen elmentett választás, vagy null, ha még nem döntött a felhasználó. */
export function readConsent(): StoredConsent | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (parsed.version !== STORAGE_VERSION || !parsed.choices) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConsent(choices: ConsentChoices) {
  if (!isBrowser()) return;
  const stored: StoredConsent = {
    version: STORAGE_VERSION,
    choices: { ...choices, szukseges: true },
    decidedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    /* localStorage hiánya (pl. privát böngészés) sosem törheti meg az appot */
  }
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: stored.choices }));
}

export function acceptAll(): ConsentChoices {
  const choices: ConsentChoices = { szukseges: true, analitika: true, marketing: true };
  writeConsent(choices);
  return choices;
}

export function rejectAll(): ConsentChoices {
  const choices: ConsentChoices = { szukseges: true, analitika: false, marketing: false };
  writeConsent(choices);
  return choices;
}

/**
 * Gating helper -- MINDEN nem-szükséges scriptet/pixelt ez mögé kell kötni,
 * mielőtt betöltődik. Pl.:
 *   if (hasConsent("analitika")) loadGoogleAnalytics();
 */
export function hasConsent(category: CookieCategory): boolean {
  if (category === "szukseges") return true;
  const stored = readConsent();
  return stored?.choices[category] ?? false;
}

/** Van-e már mentett döntés (a banner ez alapján dönt, hogy megjelenjen-e). */
export function hasDecided(): boolean {
  return readConsent() !== null;
}

/** Bárhonnan (pl. lábléc "Süti-beállítások" link) meghívható a panel újranyitásához. */
export function openCookieSettings() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}

// ── useSyncExternalStore támogatás (React) ──
// A localStorage-t úgy olvassuk be React-komponensbe, hogy SSR-en biztonságos
// (getServerSnapshot) és nem okoz felesleges rendert (a snapshot csak akkor
// kap új referenciát, ha a nyers localStorage-string ténylegesen változott).
let cachedRaw: string | null | undefined;
let cachedSnapshot: ConsentChoices | null = null;

/** getSnapshot: useSyncExternalStore(subscribeConsent, getConsentSnapshot, getConsentServerSnapshot) */
export function getConsentSnapshot(): ConsentChoices | null {
  if (!isBrowser()) return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  const stored = readConsent();
  cachedSnapshot = stored?.choices ?? null;
  return cachedSnapshot;
}

export function getConsentServerSnapshot(): ConsentChoices | null {
  return null;
}

export function subscribeConsent(onChange: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(COOKIE_CONSENT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(COOKIE_CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
