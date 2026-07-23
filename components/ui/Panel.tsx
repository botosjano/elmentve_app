import type { ReactNode } from "react";

/** Üveg-panel: az Elmentve kötelező felületi alapeleme (handoff). */
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`panel ${className}`}>{children}</div>;
}
