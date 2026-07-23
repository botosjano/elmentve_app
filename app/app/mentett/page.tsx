import type { Metadata } from "next";
import { SavedItemsList } from "@/components/app/SavedItemsList";

export const metadata: Metadata = { title: "Elmentett dolgok" };

export default function Page() {
  return <SavedItemsList />;
}
