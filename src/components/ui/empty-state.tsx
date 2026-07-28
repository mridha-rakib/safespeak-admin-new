import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon: IconComponent,
  title,
  description,
  action,
  className,
}: {
  icon?: Icon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-secondary/30 px-6 py-12 text-center",
        className
      )}
    >
      {IconComponent ? (
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-primary shadow-card">
          <IconComponent size={22} aria-hidden="true" />
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
