"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Route } from "next";
import Link from "next/link";

import { PublishableRowActions } from "@/components/content/publishable-row-actions";
import { Badge } from "@/components/ui/badge";
import { ContentStatusBadge } from "@/components/ui/status-badge";
import { getReviewDueState, REVIEW_DUE_STATE_LABEL } from "@/lib/content/review-due";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import { getMicrocardBlockers, type MicrocardEligibilityContext } from "@/lib/microcards/eligibility";
import { CONTENT_PRIORITY_LABEL } from "@/lib/models/content-common";
import type { Microcard } from "@/lib/models/microcard";
import type { PublishableContentRepository } from "@/lib/repositories/admin-content-repository";

const REVIEW_DUE_TONE: Record<ReturnType<typeof getReviewDueState>, "neutral" | "warning" | "destructive"> = {
  current: "neutral",
  due_soon: "warning",
  overdue: "destructive",
  none: "neutral",
};

export function buildMicrocardColumns(
  repository: PublishableContentRepository<Microcard>,
  eligibilityContext: MicrocardEligibilityContext | undefined
): ColumnDef<Microcard, unknown>[] {
  return [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <Link
          href={`/content/microcards/${row.original.id}` as Route}
          className="font-medium text-foreground hover:text-primary hover:underline"
          // A full table of these prefetching at once is the same
          // concurrent-prefetch-storm class of bug already fixed on the
          // sidebar nav — see components/layout/sidebar-nav.tsx.
          prefetch={false}
        >
          {row.original.title}
        </Link>
      ),
    },
    { accessorKey: "cardType", header: "Card type", cell: ({ getValue }) => getValue<string>() ?? "Not set" },
    { accessorKey: "jurisdiction", header: "Jurisdiction", cell: ({ getValue }) => jurisdictionLabel(getValue<string | undefined>()) },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ getValue }) => CONTENT_PRIORITY_LABEL[getValue<Microcard["priority"]>()],
    },
    { accessorKey: "displayOrder", header: "Order" },
    {
      id: "reviewDue",
      header: "Review due",
      cell: ({ row }) => {
        const state = getReviewDueState(row.original.reviewDueDate);
        return <Badge tone={REVIEW_DUE_TONE[state]}>{REVIEW_DUE_STATE_LABEL[state]}</Badge>;
      },
    },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <ContentStatusBadge status={getValue<Microcard["status"]>()} /> },
    { accessorKey: "updatedAt", header: "Updated", cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString() },
    { accessorKey: "isDemo", header: "Demo", cell: ({ getValue }) => (getValue<boolean>() ? <Badge tone="neutral">Demo</Badge> : null) },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <PublishableRowActions
          record={row.original}
          label={row.original.title}
          repository={repository}
          baseRoute="/content/microcards"
          canPublish={eligibilityContext ? getMicrocardBlockers(row.original, eligibilityContext).length === 0 : false}
        />
      ),
    },
  ];
}
