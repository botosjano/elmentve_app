/**
 * A weboldal TÉNYLEGESEN tartalmat kiszolgáló hosztja -- ez az EGYETLEN hely,
 * ahonnan a canonical/sitemap/robots/OG a bázis-URL-t olvassa.
 *
 * `www.elmentve.hu` a helyes, NEM az apex: a `elmentve.hu` (www nélkül) a
 * Vercel domain-beállításában 308-cal a www-re irányít, sosem szolgál ki
 * tartalmat közvetlenül (élőben ellenőrizve, kártya: e4a08a49). Ha a
 * canonical/sitemap az apexet jelöli meg, a kereső egy olyan URL-t kap
 * indexelésre, ami maga is csak egy átirányítás -- ugyanez a hibaosztály
 * történt korábban a TerraCode-on is (l. flotta-memória
 * project_terracode_canonical_host_apex), ott a hreflang-annotációk
 * érvénytelenné válásához vezetett.
 *
 * HA A VERCEL-OLDALI ELSŐDLEGES DOMAIN VALAHA MEGVÁLTOZIK (pl. Janos úgy
 * dönt hogy az apex legyen az elsődleges, ahogy a TerraCode-nál), EZT az
 * egy sort kell módosítani -- ne a három fájlba beégetett URL-eket
 * egyenként keresgélni.
 */
export const SITE_URL = "https://www.elmentve.hu";
