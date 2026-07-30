"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Route } from "next";
import Link from "next/link";

import { PublishableRowActions } from "@/components/content/publishable-row-actions";
import { Badge } from "@/components/ui/badge";
import { ContentStatusBadge } from "@/components/ui/status-badge";
import { getReviewDueState, REVIEW_DUE_STATE_LABEL } from "@/lib/content/review-due";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import type { ReportingDestination } from "@/lib/models/reporting-destination";
import { DESTINATION_TYPE_LABEL, REPORTING_METHOD_LABEL, TRISTATE_LABEL } from "@/lib/models/reporting-destination-type";
import type { PublishableContentRepository } from "@/lib/repositories/admin-content-repository";
import { getDestinationBlockers, type DestinationEligibilityContext } from "@/lib/support-directory/destination-eligibility";

const REVIEW_DUE_TONE: Record<ReturnType<typeof getReviewDueState>, "neutral" | "warning" | "destructive"> = {
  current: "neutral",
  due_soon: "warning",
  overdue: "destructive",
  none: "neutral",
};

export function buildDestinationColumns(
  repository: PublishableContentRepository<ReportingDestination>,
  eligibilityContext: DestinationEligibilityContext | undefined
): ColumnDef<ReportingDestination, unknown>[] {
  return [
    {
      accessorKey: "name",
      header: "Destination",
      cell: ({ row }) => (
        <Link
          href={`/content/reporting-destinations/${row.original.id}` as Route}
          className="font-medium text-foreground hover:text-primary hover:underline"
          prefetch={false}
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "destinationType",
      header: "Destination type",
      cell: ({ getValue }) => {
        const type = getValue<ReportingDestination["destinationType"]>();
        return type ? DESTINATION_TYPE_LABEL[type] : "Not set";
      },
    },
    {
      id: "jurisdictions",
      header: "Jurisdictions",
      cell: ({ row }) =>
        row.original.australiaWide ? "Australia-wide" : row.original.jurisdictions.map(jurisdictionLabel).join(", ") || "Not set",
    },
    {
      id: "reportingMethods",
      header: "Reporting methods",
      cell: ({ row }) => row.original.reportingMethods.map((m) => REPORTING_METHOD_LABEL[m]).join(", ") || "None set",
    },
    {
      accessorKey: "anonymousReporting",
      header: "Anonymous reporting",
      cell: ({ getValue }) => TRISTATE_LABEL[getValue<ReportingDestination["anonymousReporting"]>()],
    },
    {
      accessorKey: "emergencySuitability",
      header: "Emergency suitability",
      cell: ({ getValue }) => TRISTATE_LABEL[getValue<ReportingDestination["emergencySuitability"]>()],
    },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <ContentStatusBadge status={getValue<ReportingDestination["status"]>()} /> },
    {
      id: "reviewDue",
      header: "Review due",
      cell: ({ row }) => {
        const state = getReviewDueState(row.original.reviewDueDate);
        return <Badge tone={REVIEW_DUE_TONE[state]}>{REVIEW_DUE_STATE_LABEL[state]}</Badge>;
      },
    },
    { accessorKey: "updatedAt", header: "Updated", cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString() },
    { accessorKey: "isDemo", header: "Demo", cell: ({ getValue }) => (getValue<boolean>() ? <Badge tone="neutral">Demo</Badge> : null) },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <PublishableRowActions
          record={row.original}
          label={row.original.name}
          repository={repository}
          baseRoute="/content/reporting-destinations"
          canPublish={eligibilityContext ? getDestinationBlockers(row.original, eligibilityContext).length === 0 : false}
        />
      ),
    },
  ];
}
