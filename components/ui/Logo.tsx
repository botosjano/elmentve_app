import Image from "next/image";

/**
 * Elmentve márkajel: a laposított jel (fotókártya + menta pipa) + szólogó.
 * A fejlécben és az oldalsávban ezt a kompakt változatot kell használni
 * (handoff: nem helyettesíthető generikus fájl-/kép-ikonnal).
 */
export function Logo({ className = "", showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image src="/brand/mark.svg" alt="Elmentve" width={32} height={32} className="h-8 w-8" priority />
      {showWordmark && (
        <Image src="/brand/wordmark.svg" alt="Elmentve" width={104} height={24} className="h-5 w-auto" priority />
      )}
    </span>
  );
}
