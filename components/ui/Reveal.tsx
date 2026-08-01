"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Flotta-animáció-szabvány: a közvetlen gyerekek egyenként beúsznak
 * (fade + slide + blur, lépcsőzetesen -- lásd .el-reveal a globals.css-ben),
 * amikor a blokk viewportba ér görgetéskor. Csak egyszer fut le.
 */
export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    try {
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );
      io.observe(el);
      return () => io.disconnect();
    } catch {
      setInView(true);
    }
  }, []);

  return (
    <div ref={ref} className={`el-reveal ${inView ? "is-in" : ""} ${className}`}>
      {children}
    </div>
  );
}
