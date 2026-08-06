import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { MobileTopBar } from "./MobileTopBar";

/**
 * App-váz: desktopon fix bal oldalsáv, mobilon felső sáv + fix alsó navigáció
 * (handoff reszponzív szabályok). A tartalom max szélessége 1120px.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <Sidebar />
      <MobileTopBar />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-content flex-1 px-5 pb-28 pt-4 sm:px-8 lg:pb-10 lg:pt-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
