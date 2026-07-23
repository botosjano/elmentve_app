import type { Metadata } from "next";
import { SaveField } from "@/components/app/SaveField";
import { HomeSections } from "@/components/app/HomeSections";

export const metadata: Metadata = { title: "Kezdőlap" };

/** 01-home: nyitóképernyő természetes nyelvű mentéssel + közelgő/legutóbb listák. */
export default function AppHome() {
  return (
    <div>
      <h1 className="mb-6 text-[2rem] font-medium tracking-tight text-ink sm:text-[2.5rem]">
        Minden rendben lesz.
      </h1>
      <SaveField />
      <HomeSections />
    </div>
  );
}
