import type { Metadata } from "next";
import { RemindersView } from "@/components/app/RemindersView";

export const metadata: Metadata = { title: "Emlékeztetők" };

export default function Page() {
  return <RemindersView />;
}
