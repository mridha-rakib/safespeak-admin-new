"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Route } from "next";
import Link from "next/link";

import { TaxonomyRowActions } from "@/components/taxonomy/taxonomy-row-actions";
import { Badge } from "@/components/ui/badge";
import { ContentStatusBadge } from "@/components/ui/status-badge";
import { getResourceCategoryBlockers } from "@/lib/taxonomy/eligibility";
import type { ResourceCategory } from "@/lib/models/resource-category";
import type { AdminContentRepository } from "@/lib/repositories/admin-content-repository";
import { RESOURCE_CATEGORY_ICON_COMPONENTS } from "@/lib/taxonomy/resource-icons";
import type { TaxonomyDataBundle } from "@/lib/taxonomy/dependency-service";
import { computeTaxonomyUsage } from "@/lib/taxonomy/dependency-service";

export function buildResourceCategoryColumns(
  repository: AdminContentRepository,
  allRecords: ResourceCategory[],
  dataBundle: TaxonomyDataBundle | undefined,
  onReplaceReferences: (record: ResourceCategory) => void
): ColumnDef<ResourceCategory, unknown>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const IconComponent = row.original.iconKey ? RESOURCE_CATEGORY_ICON_COMPONENTS[row.original.iconKey] : null;
        return (
          <Link
            href={`/taxonomy/resource-categories/${row.original.id}` as Route}
            className="flex items-center gap-2 font-medium text-foreground hover:text-primary hover:underline"
          >
            {IconComponent ? <IconComponent size={16} aria-hidden="true" /> : null}
            {row.original.name}
          </Link>
        );
      },
    },
    { accessorKey: "machineKey", header: "Machine key", cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code> },
    { accessorKey: "displayOrder", header: "Order" },
    {
      id: "usage",
      header: "Usage",
      cell: ({ row }) => (dataBundle ? computeTaxonomyUsage("resource_category", row.original.id, dataBundle).totalCount : "—"),
    },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <ContentStatusBadge status={getValue<ResourceCategory["status"]>()} /> },
    { accessorKey: "updatedAt", header: "Updated", cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString() },
    { accessorKey: "isDemo", header: "Demo", cell: ({ getValue }) => (getValue<boolean>() ? <Badge tone="neutral">Demo</Badge> : null) },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <TaxonomyRowActions
          record={row.original}
          repository={repository.resourceCategories}
          baseRoute="/taxonomy/resource-categories"
          canPublish={getResourceCategoryBlockers(row.original, allRecords.filter((r) => r.id !== row.original.id)).length === 0}
          onReplaceReferences={() => onReplaceReferences(row.original)}
        />
      ),
    },
  ];
}
