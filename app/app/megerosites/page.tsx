import { Suspense } from "react";
import type { Metadata } from "next";
import { ConfirmationCard } from "@/components/app/ConfirmationCard";

export const metadata: Metadata = { title: "Megerősítés" };

/** 02-confirmation. A useSearchParams miatt Suspense-be csomagolva. */
export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-muted">Betöltés…</div>}>
      <ConfirmationCard />
    </Suspense>
  );
}
