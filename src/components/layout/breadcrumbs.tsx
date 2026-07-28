"use client";

import { IconChevronRight } from "@tabler/icons-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { findGroupLabelForPath, findNavLinkForPath } from "@/lib/navigation";

export function Breadcrumbs() {
  const pathname = usePathname();
  const currentLink = findNavLinkForPath(pathname);
  const groupLabel = findGroupLabelForPath(pathname);

  const trail: { label: string; href?: string }[] = [{ label: "Dashboard", href: "/dashboard" }];
  if (groupLabel) trail.push({ label: groupLabel });
  if (currentLink && currentLink.href !== "/dashboard") {
    trail.push({ label: currentLink.label, href: currentLink.href });
  }

  return (
    <nav aria-label="Breadcrumb" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              {index > 0 ? <IconChevronRight size={12} aria-hidden="true" /> : null}
              <li>
                {crumb.href && !isLast ? (
                  <Link href={crumb.href as Route} className="hover:text-primary hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current={isLast ? "page" : undefined} className={isLast ? "text-foreground" : undefined}>
                    {crumb.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
