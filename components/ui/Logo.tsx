import Image from "next/image";

/**
 * Elmentve márkajel: a laposított jel (fotókártya + menta pipa) + szólogó.
 * A fejlécben és az oldalsávban ezt a kompakt változatot kell használni
 * (handoff: nem helyettesíthető generikus fájl-/kép-ikonnal).
 */
export function Logo({ className = "", showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image src="/brand/mark-tile.png" alt="Elmentve" width={40} height={40} className="h-9 w-9 rounded-[11px] shadow-[0_8px_20px_-10px_rgba(107,94,235,0.7)]" priority />
      {showWordmark && (
        <Image src="/brand/wordmark.svg" alt="Elmentve" width={104} height={24} className="h-5 w-auto" priority />
      )}
    </span>
  );
}
