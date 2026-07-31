/**
 * Központi jogi/cégadat-konfiguráció (kártya: cookie consent + jogi oldalak
 * scaffold). EZ A VALÓS FORRÁS -- az adatvédelmi tájékoztató, az impresszum
 * (ha készül) és a cookie-consent banner is EBBŐL olvas, hogy a céges adatok
 * egy helyen legyenek karbantarthatók.
 *
 * FONTOS: az alábbi mezők MIND PLACEHOLDER értékek. A valós céges/jogi
 * adatokat a cégtulajdonostól kell bekérni, mielőtt éles környezetbe kerül
 * az oldal -- ADDIG NE tekintsd ezt a fájlt véglegesnek.
 */

// TODO(jogi adatok -- Janos / cégtulajdonos tölti ki):
// - cegNev: a szolgáltatást üzemeltető gazdasági társaság hivatalos, cégjegyzék
//   szerinti neve.
// - szekhely: a cég hivatalos székhelye (irányítószám, város, utca, hsz.).
// - cegjegyzekszam: cégbírósági cégjegyzékszám (formátum: 01-09-999999).
// - adoszam: adószám (formátum: 99999999-9-99).
// - email: az adatvédelmi/ügyfélszolgálati megkeresésekre figyelt email cím.
// - telefon: ügyfélszolgálati telefonszám (opcionális, ha van).
// - adatvedelmiKapcsolattarto: adatvédelmi tisztviselő / kapcsolattartó neve,
//   ha van kijelölve (ha nincs, hagyd üresen vagy írd, hogy "nincs kijelölve").
export const LEGAL_INFO = {
  cegNev: "TODO: Cégnév Kft.",
  szekhely: "TODO: 1000 Budapest, Példa utca 1.",
  cegjegyzekszam: "TODO: 01-09-000000",
  adoszam: "TODO: 00000000-0-00",
  email: "TODO: adatvedelem@elmentve.hu",
  telefon: "TODO: +36 1 000 0000",
  adatvedelmiKapcsolattarto: "TODO: nincs kijelölve / kapcsolattartó neve",
} as const;

export type LegalInfo = typeof LEGAL_INFO;
