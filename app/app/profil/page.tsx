import type { Metadata } from "next";
import { ProfileView } from "@/components/app/ProfileView";

export const metadata: Metadata = { title: "Profil" };

export default function Page() {
  return <ProfileView />;
}
