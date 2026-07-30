"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Route } from "next";
import Link from "next/link";

import { TaxonomyRowActions } from "@/components/taxonomy/taxonomy-row-actions";
import { Badge } from "@/components/ui/badge";
import { ContentStatusBadge } from "@/components/ui/status-badge";
import { getIncidentTypeBlockers } from "@/lib/taxonomy/eligibility";
import type { IncidentType } from "@/lib/models/incident-type";
import type { AdminContentRepository } from "@/lib/repositories/admin-content-repository";
import type { TaxonomyDataBundle } from "@/lib/taxonomy/dependency-service";
import { computeTaxonomyUsage } from "@/lib/taxonomy/dependency-service";

const URGENCY_LABEL: Record<IncidentType["defaultUrgency"], string> = {
  not_set: "Not set",
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export function buildIncidentTypeColumns(
  repository: AdminContentRepository,
  allRecords: IncidentType[],
  dataBundle: TaxonomyDataBundle | undefined,
  onReplaceReferences: (record: IncidentType) => void
): ColumnDef<IncidentType, unknown>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <Link href={`/taxonomy/incident-types/${row.original.id}` as Route} className="font-medium text-foreground hover:text-primary hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    { accessorKey: "machineKey", header: "Machine key", cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code> },
    {
      accessorKey: "defaultUrgency",
      header: "Default urgency",
      cell: ({ getValue }) => URGENCY_LABEL[getValue<IncidentType["defaultUrgency"]>()],
    },
    { accessorKey: "displayOrder", header: "Order" },
    {
      id: "usage",
      header: "Usage",
      cell: ({ row }) => (dataBundle ? computeTaxonomyUsage("incident_type", row.original.id, dataBundle).totalCount : "—"),
    },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <ContentStatusBadge status={getValue<IncidentType["status"]>()} /> },
    { accessorKey: "updatedAt", header: "Updated", cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString() },
    { accessorKey: "isDemo", header: "Demo", cell: ({ getValue }) => (getValue<boolean>() ? <Badge tone="neutral">Demo</Badge> : null) },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <TaxonomyRowActions
          record={row.original}
          repository={repository.incidentTypes}
          baseRoute="/taxonomy/incident-types"
          canPublish={getIncidentTypeBlockers(row.original, allRecords.filter((r) => r.id !== row.original.id)).length === 0}
          onReplaceReferences={() => onReplaceReferences(row.original)}
        />
      ),
    },
  ];
}
