"use client";

/**
 * Skip link, kiemelve a layout.tsx-ből (kártya 9f71acc2, Elemer találata):
 * Enter a linken a hash-t és a görgetést átváltja a böngésző natívan, de a
 * FÓKUSZ a <body>-n marad, mert a #main-content-nek nem volt tabindex-e.
 * A `tabIndex={-1}` (l. az egyes page.tsx-ek/AppShell.tsx kiegészítését)
 * teszi programozottan fókuszálhatóvá, de ez nem minden böngésző/AT-
 * kombinációban megbízható -- ezért itt egy explicit `.focus()` hívás a
 * robusztus, WCAG SCR28-kompatibilis kiegészítés.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      onClick={() => {
        document.getElementById("main-content")?.focus();
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[var(--radius-btn)] focus:bg-ink focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
    >
      Ugrás a tartalomhoz
    </a>
  );
}
