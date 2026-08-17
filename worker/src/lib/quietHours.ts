// Csendes orak: nem surgos ertesites nem mehet ki a felhasznalo helyi
// idozonaja szerinti csendes idoszakban (alapertelmezes 21:00-08:00).
//
// A tenyleges eltolast az app szamolja a mentes/ujraszamitas pillanataban
// (spec 7. resz), de a Worker is ellenorzi kuldes elott -- ha idokozben
// valtozott a csendes-ora beallitas, es meg nem futott le az ujraszamitas,
// a Worker akkor se kuldjon csendes idoben.

export interface QuietHoursWindow {
  /** "HH:MM" 24 orás formátumban, a felhasznalo helyi idozonajaban. */
  quietStart: string;
  quietEnd: string;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * localMinutes: a kuldesi pillanat perce a felhasznalo helyi idozonajaban
 * (0-1439). A hivo felelossege az Intl.DateTimeFormat-tal szamolt
 * atvaltas -- ez a fuggveny csak sima aritmetika, tesztelheto TZ nelkul.
 */
export function isWithinQuietHours(
  localMinutes: number,
  window: QuietHoursWindow,
): boolean {
  const start = toMinutes(window.quietStart);
  const end = toMinutes(window.quietEnd);
  if (start === end) return false; // nincs csendes ablak
  if (start < end) {
    return localMinutes >= start && localMinutes < end;
  }
  // Athuzodik ejfelen, pl. 21:00-08:00
  return localMinutes >= start || localMinutes < end;
}

/**
 * Ha a kuldes csendes idobe esne, visszaadja hany perccel kell eltolni a
 * kovetkezo engedelyezett (quietEnd) idopontig -- ugyanaznap vagy masnap.
 * Ha nem esik csendes idobe, 0-t ad vissza.
 */
export function minutesUntilQuietWindowEnds(
  localMinutes: number,
  window: QuietHoursWindow,
): number {
  if (!isWithinQuietHours(localMinutes, window)) return 0;
  const end = toMinutes(window.quietEnd);
  if (localMinutes < end) {
    return end - localMinutes;
  }
  return 24 * 60 - localMinutes + end;
}
