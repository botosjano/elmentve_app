import { Car, IdCard, CalendarClock, WashingMachine, BookMarked, House, Droplet, FileText, type LucideIcon } from "lucide-react";
import type { IconKey } from "@/lib/mockData";

export const ITEM_ICONS: Record<IconKey, LucideIcon> = {
  car: Car,
  id: IdCard,
  appointment: CalendarClock,
  washer: WashingMachine,
  passport: BookMarked,
  house: House,
  oil: Droplet,
  contract: FileText,
};

const SIZES = { sm: "h-11 w-11 rounded-2xl", md: "h-14 w-14 rounded-2xl", lg: "h-20 w-20 rounded-[22px]" };
const ICON_SIZES = { sm: "h-5 w-5", md: "h-6 w-6", lg: "h-9 w-9" };

/** Tétel-előnézet: színezett csempe + kategória-ikon (valós fotó helyett, demó). */
export function Thumb({ icon, tint, size = "sm" }: { icon: IconKey; tint: string; size?: keyof typeof SIZES }) {
  const Icon = ITEM_ICONS[icon];
  return (
    <span className={`flex shrink-0 items-center justify-center text-lilac ${tint} ${SIZES[size]}`}>
      <Icon className={ICON_SIZES[size]} strokeWidth={2} />
    </span>
  );
}
