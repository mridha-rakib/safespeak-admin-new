"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Route } from "next";
import Link from "next/link";

import { TaxonomyRowActions } from "@/components/taxonomy/taxonomy-row-actions";
import { Badge } from "@/components/ui/badge";
import { ContentStatusBadge } from "@/components/ui/status-badge";
import { getTriageLabelBlockers } from "@/lib/taxonomy/eligibility";
import type { TriageLabel } from "@/lib/models/triage-label";
import type { AdminContentRepository } from "@/lib/repositories/admin-content-repository";
import type { TaxonomyDataBundle } from "@/lib/taxonomy/dependency-service";
import { computeTaxonomyUsage } from "@/lib/taxonomy/dependency-service";

const LABEL_GROUP_LABEL: Record<TriageLabel["labelGroup"], string> = {
  safety: "Safety",
  urgency: "Urgency",
  context_indicator: "Context indicator",
  bias_indicator: "Bias indicator",
  support_need: "Support need",
  accessibility_need: "Accessibility need",
  other: "Other",
};

export function buildTriageLabelColumns(
  repository: AdminContentRepository,
  allRecords: TriageLabel[],
  dataBundle: TaxonomyDataBundle | undefined,
  onReplaceReferences: (record: TriageLabel) => void
): ColumnDef<TriageLabel, unknown>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <Link href={`/taxonomy/triage-labels/${row.original.id}` as Route} className="font-medium text-foreground hover:text-primary hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    { accessorKey: "machineKey", header: "Machine key", cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code> },
    {
      accessorKey: "labelGroup",
      header: "Label group",
      cell: ({ getValue }) => LABEL_GROUP_LABEL[getValue<TriageLabel["labelGroup"]>()],
    },
    { accessorKey: "displayOrder", header: "Order" },
    {
      id: "usage",
      header: "Usage",
      cell: ({ row }) => (dataBundle ? computeTaxonomyUsage("triage_label", row.original.id, dataBundle).totalCount : "—"),
    },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <ContentStatusBadge status={getValue<TriageLabel["status"]>()} /> },
    { accessorKey: "updatedAt", header: "Updated", cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString() },
    { accessorKey: "isDemo", header: "Demo", cell: ({ getValue }) => (getValue<boolean>() ? <Badge tone="neutral">Demo</Badge> : null) },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <TaxonomyRowActions
          record={row.original}
          repository={repository.triageLabels}
          baseRoute="/taxonomy/triage-labels"
          canPublish={getTriageLabelBlockers(row.original, allRecords.filter((r) => r.id !== row.original.id)).length === 0}
          onReplaceReferences={() => onReplaceReferences(row.original)}
        />
      ),
    },
  ];
}
