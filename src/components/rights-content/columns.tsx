"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Route } from "next";
import Link from "next/link";

import { PublishableRowActions } from "@/components/content/publishable-row-actions";
import { Badge } from "@/components/ui/badge";
import { ContentStatusBadge } from "@/components/ui/status-badge";
import { getReviewDueState, REVIEW_DUE_STATE_LABEL } from "@/lib/content/review-due";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import { CONTENT_PRIORITY_LABEL } from "@/lib/models/content-common";
import type { RightsContent } from "@/lib/models/rights-content";
import type { PublishableContentRepository } from "@/lib/repositories/admin-content-repository";
import { contentTypeRequiresLegalSource, getRightsContentBlockers, type RightsContentEligibilityContext } from "@/lib/rights-content/eligibility";

const REVIEW_DUE_TONE: Record<ReturnType<typeof getReviewDueState>, "neutral" | "warning" | "destructive"> = {
  current: "neutral",
  due_soon: "warning",
  overdue: "destructive",
  none: "neutral",
};

export function buildRightsContentColumns(
  repository: PublishableContentRepository<RightsContent>,
  eligibilityContext: RightsContentEligibilityContext | undefined
): ColumnDef<RightsContent, unknown>[] {
  return [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <Link
          href={`/content/rights-legal-information/${row.original.id}` as Route}
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
    { accessorKey: "contentType", header: "Content type", cell: ({ getValue }) => getValue<string>() ?? "Not set" },
    { accessorKey: "jurisdiction", header: "Jurisdiction", cell: ({ getValue }) => jurisdictionLabel(getValue<string | undefined>()) },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ getValue }) => CONTENT_PRIORITY_LABEL[getValue<RightsContent["priority"]>()],
    },
    {
      id: "legalClaim",
      header: "Legal claim",
      cell: ({ row }) => (contentTypeRequiresLegalSource(row.original.contentType) ? <Badge tone="warning">Legal claim</Badge> : <Badge tone="neutral">Informational</Badge>),
    },
    {
      id: "reviewDue",
      header: "Review due",
      cell: ({ row }) => {
        const state = getReviewDueState(row.original.reviewDueDate);
        return <Badge tone={REVIEW_DUE_TONE[state]}>{REVIEW_DUE_STATE_LABEL[state]}</Badge>;
      },
    },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <ContentStatusBadge status={getValue<RightsContent["status"]>()} /> },
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
          baseRoute="/content/rights-legal-information"
          canPublish={eligibilityContext ? getRightsContentBlockers(row.original, eligibilityContext).length === 0 : false}
        />
      ),
    },
  ];
}
