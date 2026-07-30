import type { Route } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { UsageSummary } from "@/lib/taxonomy/dependency-service";

/**
 * Shared by all three taxonomy detail pages. Only renders a link when the
 * referencing module actually has a details route today — everything else
 * is honest plain text rather than a dead link.
 */
export function UsageSummaryView({ usage }: { usage: UsageSummary }) {
  if (usage.totalCount === 0) {
    return <EmptyState title="Not currently used" description="No other local record references this item yet." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {usage.byEntityType.map((group) => (
          <Badge key={group.entityType} tone="primary">
            {group.entityLabel}: {group.count}
          </Badge>
        ))}
      </div>
      <ul className="space-y-1.5">
        {usage.references.map((ref, index) => (
          <li key={`${ref.entityType}-${ref.recordId}-${index}`} className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone="neutral">{ref.entityLabel}</Badge>
            {ref.detailHref ? (
              <Link href={ref.detailHref as Route} className="text-primary hover:underline">
                {ref.recordName}
              </Link>
            ) : (
              <span className="text-foreground">{ref.recordName}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
