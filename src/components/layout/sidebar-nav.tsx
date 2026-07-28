"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_SECTIONS, type NavLink as NavLinkItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({ item, active, onNavigate }: { item: NavLinkItem; active: boolean; onNavigate?: () => void }) {
  const ItemIcon = item.icon;
  return (
    <Link
      href={item.href as Route}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <ItemIcon size={18} stroke={1.9} aria-hidden="true" className="shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

/** Shared between the desktop sidebar and the mobile drawer so both stay identical. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin navigation" className="flex flex-col gap-6">
      {NAV_SECTIONS.map((section) => {
        if (section.type === "link") {
          return (
            <NavItem
              key={section.href}
              item={section}
              active={isActive(pathname, section.href)}
              onNavigate={onNavigate}
            />
          );
        }

        return (
          <div key={section.label} className="space-y-1">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  active={isActive(pathname, item.href)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
