"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import { DocumentRowActions } from "@/components/legislation/detail/document-row-actions";
import { Badge } from "@/components/ui/badge";
import { ContentStatusBadge } from "@/components/ui/status-badge";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import { isReviewOverdue } from "@/lib/legislation/readiness";
import type { DocumentRecord } from "@/lib/models/document";

export const documentColumns: ColumnDef<DocumentRecord, unknown>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <Link href={`/content/knowledge-legislation/${row.original.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: "sourceType",
    header: "Source type",
    cell: ({ getValue }) => <span className="capitalize">{getValue<string>().replace(/_/g, " ")}</span>,
  },
  {
    accessorKey: "sourceCategory",
    header: "Source category",
    cell: ({ getValue }) => getValue<string | undefined>() ?? "—",
  },
  {
    accessorKey: "authorityOrPublisher",
    header: "Authority / publisher",
    cell: ({ getValue }) => getValue<string | undefined>() ?? "—",
  },
  {
    accessorKey: "jurisdiction",
    header: "Jurisdiction",
    cell: ({ getValue }) => jurisdictionLabel(getValue<string | undefined>()),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => <ContentStatusBadge status={getValue<DocumentRecord["status"]>()} />,
  },
  {
    accessorKey: "aiUsagePermission",
    header: "AI use",
    cell: ({ getValue }) => (getValue<boolean>() ? <Badge tone="success">Allowed</Badge> : <Badge tone="neutral">Not allowed</Badge>),
  },
  {
    accessorKey: "legalReviewComplete",
    header: "Legal review",
    cell: ({ getValue }) => (getValue<boolean>() ? <Badge tone="success">Complete</Badge> : <Badge tone="warning">Needed</Badge>),
  },
  {
    accessorKey: "processingStatus",
    header: "Local processing",
    cell: ({ getValue }) => {
      const value = getValue<DocumentRecord["processingStatus"]>();
      return (
        <Badge tone={value === "ready_for_ai_processing" ? "success" : value === "processing_issue" ? "warning" : "neutral"}>
          {value.replace(/_/g, " ")}
        </Badge>
      );
    },
  },
  {
    accessorKey: "nextReviewDate",
    header: "Next review",
    cell: ({ row }) => {
      const date = row.original.nextReviewDate;
      if (!date) return "—";
      const overdue = isReviewOverdue(row.original);
      return (
        <span className={overdue ? "font-semibold text-warning" : undefined}>
          {date}
          {overdue ? " (overdue)" : ""}
        </span>
      );
    },
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString(),
  },
  {
    accessorKey: "isDemo",
    header: "Demo",
    cell: ({ getValue }) => (getValue<boolean>() ? <Badge tone="neutral">Demo</Badge> : null),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <DocumentRowActions document={row.original} />,
    enableSorting: false,
  },
];
