import { IconUserCircle } from "@tabler/icons-react";
import Link from "next/link";

import { SafeSpeakLogo } from "@/components/brand/safespeak-logo";
import { MobileNav } from "@/components/layout/mobile-nav";

export function Header() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6 lg:pl-6">
      <div className="flex items-center gap-3">
        <MobileNav />
        <Link href="/dashboard" className="lg:hidden">
          <SafeSpeakLogo size="sm" />
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden rounded-full border border-border bg-secondary/60 px-3 py-1 text-[11px] font-semibold text-muted-foreground sm:inline-flex">
          Local demo data
        </span>
        <span className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground">
          <IconUserCircle size={18} className="text-primary" aria-hidden="true" />
          Local Administrator
        </span>
      </div>
    </header>
  );
}
