import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-btn)] px-5 py-3 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 min-h-11";

const VARIANTS: Record<Variant, string> = {
  // Elsődleges művelet: menta CTA (mentés / jóváhagyás).
  primary: "cta",
  // Másodlagos: lila kontúr, világos felület.
  secondary: "border border-lilac/40 bg-white text-ink hover:border-lilac hover:bg-lilac/5",
  // Ghost: háttér nélküli, finom.
  ghost: "text-ink/80 hover:text-ink hover:bg-lilac/10",
};

type CommonProps = {
  variant?: Variant;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  className = "",
  href,
  children,
  ...rest
}: CommonProps &
  ({ href: string } | (ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined }))) {
  const cls = `${BASE} ${VARIANTS[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
