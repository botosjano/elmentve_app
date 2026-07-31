"use client";

import { openCookieSettings } from "@/lib/consent";

/**
 * Bárhonnan újranyitja a cookie-consent beállító panelt (lásd
 * components/CookieConsent.tsx). Ide kerül pl. a lábléc "Süti-beállítások"
 * linkje, hogy a felhasználó a döntés után is módosíthassa a választását.
 */
export function CookieSettingsLink({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={openCookieSettings} className={className}>
      Süti-beállítások
    </button>
  );
}
