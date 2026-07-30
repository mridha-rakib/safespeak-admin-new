"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Route } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/table/data-table";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { VerificationBadge } from "@/components/ui/status-badge";
import { getReviewDueState, REVIEW_DUE_STATE_LABEL } from "@/lib/content/review-due";
import { useReviewQueue, type ReviewQueueItem } from "@/hooks/use-review-queue";

const REVIEW_DUE_TONE: Record<ReturnType<typeof getReviewDueState>, "neutral" | "warning" | "destructive"> = {
  current: "neutral",
  due_soon: "warning",
  overdue: "destructive",
  none: "neutral",
};

const columns: ColumnDef<ReviewQueueItem, unknown>[] = [
  {
    accessorKey: "domainLabel",
    header: "Module",
    cell: ({ getValue }) => <Badge tone="neutral">{getValue<string>()}</Badge>,
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <Link
        href={(row.original.detailHref ?? row.original.listHref) as Route}
        className="font-medium text-foreground hover:text-primary hover:underline"
        // Same concurrent-prefetch-storm class of bug already fixed on the
        // sidebar nav and other content tables — see
        // components/layout/sidebar-nav.tsx.
        prefetch={false}
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    id: "reviewDueDate",
    header: "Review due",
    cell: ({ row }) => {
      if (row.original.reviewDueDate === undefined) {
        return <span className="text-xs text-muted-foreground">Not applicable</span>;
      }
      const state = getReviewDueState(row.original.reviewDueDate);
      return <Badge tone={REVIEW_DUE_TONE[state]}>{REVIEW_DUE_STATE_LABEL[state]}</Badge>;
    },
  },
  {
    id: "verification",
    header: "Verification",
    cell: ({ row }) =>
      row.original.verificationStatus ? (
        <VerificationBadge status={row.original.verificationStatus} />
      ) : (
        <span className="text-xs text-muted-foreground">Not applicable</span>
      ),
  },
  {
    id: "blockers",
    header: "Blocking issues",
    cell: ({ row }) =>
      row.original.blockers.length > 0 ? (
        <ul className="list-inside list-disc space-y-0.5 text-xs text-warning">
          {row.original.blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      ) : (
        <span className="text-xs text-success">None</span>
      ),
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
  {
    id: "view",
    header: "View",
    enableSorting: false,
    cell: ({ row }) => (
      <Link
        href={(row.original.detailHref ?? row.original.listHref) as Route}
        className="text-xs font-semibold text-primary hover:underline"
        prefetch={false}
      >
        View
      </Link>
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

      <Alert tone="info" title="Read-only queue view">
        This queue is read-only — change an item&apos;s status from within its own module (use View to open it).
        Blocking issues are shown for every domain with a Publish eligibility check (Microcards, Rights &amp;
        Legal Information, Support Organisations, Advocates &amp; Counsellors, and Reporting Destinations);
        Knowledge &amp; Legislation documents use their own legislation-specific guard, not modelled here. A Not
        Verified professional or organisation can still show zero blocking issues — verification is never a
        publish requirement.
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
