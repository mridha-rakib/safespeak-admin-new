"use client";

import { IconChevronDown, IconSettings, IconUserCircle } from "@tabler/icons-react";
import type { Route } from "next";
import Link from "next/link";

import { SafeSpeakLogo } from "@/components/brand/safespeak-logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminAccount } from "@/hooks/use-admin-account";
import { getPersonInitials } from "@/lib/person-identity";

/**
 * Phase 8.4 — the top-right identity block used to be an inert `<span>`
 * hardcoding "Local Administrator" with no way to reach a self-profile.
 * Now a real Radix dropdown: "My profile" opens the canonical Admin
 * self-profile route, "Settings" reuses the existing app-level Settings
 * page. Deliberately no session-ending menu item — this app has no
 * authentication session to end, and adding one would fabricate a login
 * state that doesn't exist.
 */
export function Header() {
  const account = useAdminAccount();
  const displayName = account?.displayName ?? "Local Administrator";

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Open your admin profile — signed in as ${displayName}`}
              className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1.5 pr-3 text-sm font-semibold text-foreground transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[11px]">
                  {getPersonInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[160px] truncate sm:inline">{displayName}</span>
              <IconChevronDown size={14} className="text-muted-foreground" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={"/profile" as Route}>
                <IconUserCircle size={16} aria-hidden="true" />
                My profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={"/settings" as Route}>
                <IconSettings size={16} aria-hidden="true" />
                Settings
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
