import Link from "next/link";

import { SafeSpeakLogo } from "@/components/brand/safespeak-logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-card px-4 py-6 lg:flex">
      <Link href="/dashboard" className="px-2">
        <SafeSpeakLogo size="sm" />
        <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Admin
        </span>
      </Link>

      <div className="mt-8 flex-1">
        <SidebarNav />
      </div>

      <p className="mt-6 rounded-lg bg-secondary/60 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
        Local browser data only. No backend is connected in this phase.
      </p>
    </aside>
  );
}
