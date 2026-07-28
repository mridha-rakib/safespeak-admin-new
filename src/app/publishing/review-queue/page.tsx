"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/table/data-table";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useReviewQueue, type ReviewQueueItem } from "@/hooks/use-review-queue";

const columns: ColumnDef<ReviewQueueItem, unknown>[] = [
  {
    accessorKey: "domainLabel",
    header: "Module",
    cell: ({ getValue }) => <Badge tone="neutral">{getValue<string>()}</Badge>,
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ getValue }) => <span className="font-medium text-foreground">{getValue<string>()}</span>,
  },
  {
    accessorKey: "updatedAt",
    header: "Last updated",
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {new Date(getValue<string>()).toLocaleDateString()}
      </span>
    ),
  },
];

export default function ReviewQueuePage() {
  const items = useReviewQueue();

  return (
    <>
      <PageHeader
        title="Review Queue"
        description="Everything across content modules currently marked Ready for review, in one place."
      />

      <Alert tone="info" title="Read-only preview in this phase">
        Approving, rejecting, or editing items from the queue is part of each module&apos;s full content
        management, which is planned for a later phase. Change an item&apos;s status from within its own
        module once that workflow exists.
      </Alert>

      <DataTable
        caption="Review queue"
        columns={columns}
        data={items}
        searchPlaceholder="Search the review queue..."
        emptyTitle="Nothing is waiting for review"
        emptyDescription="Items move here automatically once their status is set to Ready for review."
        pageSizeStorageKey="safespeak-admin:review-queue:page-size"
      />
    </>
  );
}
