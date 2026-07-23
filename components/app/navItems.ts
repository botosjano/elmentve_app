import { Home, Bookmark, Bell, Settings, User, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Desktop oldalsáv navigáció. */
export const SIDEBAR_NAV: NavItem[] = [
  { href: "/app", label: "Kezdőlap", icon: Home },
  { href: "/app/mentett", label: "Elmentett dolgok", icon: Bookmark },
  { href: "/app/emlekeztetok", label: "Emlékeztetők", icon: Bell },
  { href: "/app/beallitasok", label: "Beállítások", icon: Settings },
];

/** Mobil alsó navigáció -- a középső "Új mentés" külön, kiemelt elem. */
export const BOTTOM_LEFT: NavItem[] = [
  { href: "/app", label: "Kezdőlap", icon: Home },
  { href: "/app/mentett", label: "Mentett", icon: Bookmark },
];
export const BOTTOM_RIGHT: NavItem[] = [
  { href: "/app/emlekeztetok", label: "Emlékeztetők", icon: Bell },
  { href: "/app/profil", label: "Profil", icon: User },
];
