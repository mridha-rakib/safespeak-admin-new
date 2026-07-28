import type { Icon } from "@tabler/icons-react";
import type { Route } from "next";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: IconComponent,
  href,
  tone = "default",
}: {
  label: string;
  value: number | undefined;
  icon: Icon;
  href?: string;
  tone?: "default" | "warning";
}) {
  const content = (
    <CardContent className="flex items-center gap-4 p-5">
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
          tone === "warning" ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary"
        )}
      >
        <IconComponent size={22} aria-hidden="true" />
      </span>
      <div>
        {value === undefined ? (
          <Skeleton className="h-7 w-10" />
        ) : (
          <p className="text-2xl font-bold text-foreground">{value}</p>
        )}
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  );

  if (href) {
    return (
      <Link
        href={href as Route}
        className="block rounded-xl focus-visible:outline-none"
        aria-label={`${label}. View in ${label}.`}
      >
        <Card className="transition hover:border-primary/40 hover:shadow-panel">{content}</Card>
      </Link>
    );
  }

  return <Card>{content}</Card>;
}
