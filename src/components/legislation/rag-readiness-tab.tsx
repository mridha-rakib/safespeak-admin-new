"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { DataTable } from "@/components/table/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useRagReadinessSummary } from "@/hooks/use-rag-readiness-summary";
import {
  getAiEligibilityBlockers,
  getOverallReadiness,
  getPublicationBlockers,
  hasSuccessfulExtraction,
  isRequiredMetadataComplete,
  type OverallReadiness,
} from "@/lib/legislation/readiness";
import type { DocumentRecord } from "@/lib/models/document";

const READINESS_LABEL: Record<OverallReadiness, string> = {
  ready: "Ready",
  blocked: "Blocked",
  awaiting_review: "Awaiting review",
  processing_issue: "Processing issue",
};

const READINESS_TONE: Record<OverallReadiness, "success" | "warning" | "neutral"> = {
  ready: "success",
  blocked: "warning",
  awaiting_review: "neutral",
  processing_issue: "warning",
};

type ReadinessFilter = "all" | OverallReadiness | "ai_permission_missing";

interface ReadinessRow {
  document: DocumentRecord;
  overall: OverallReadiness;
  blockers: string[];
}

const columns: ColumnDef<ReadinessRow, unknown>[] = [
  { accessorFn: (row) => row.document.title, id: "title", header: "Document", cell: ({ row }) => row.original.document.title },
  { accessorFn: (row) => row.document.status, id: "status", header: "Publication status", cell: ({ row }) => row.original.document.status.replace(/_/g, " ") },
  {
    id: "file",
    header: "File status",
    cell: ({ row }) => (row.original.document.file ? "Available" : "Missing"),
  },
  {
    id: "extraction",
    header: "Extraction",
    cell: ({ row }) => (hasSuccessfulExtraction(row.original.document) ? "Extracted" : "Not extracted"),
  },
  {
    id: "metadata",
    header: "Metadata",
    cell: ({ row }) => (isRequiredMetadataComplete(row.original.document) ? "Complete" : "Incomplete"),
  },
  {
    id: "legalReview",
    header: "Legal review",
    cell: ({ row }) => (row.original.document.legalReviewComplete ? "Complete" : "Needed"),
  },
  {
    id: "aiPermission",
    header: "AI permission",
    cell: ({ row }) => (row.original.document.aiUsagePermission ? "Allowed" : "Not allowed"),
  },
  {
    accessorFn: (row) => row.document.nextReviewDate ?? "",
    id: "reviewDate",
    header: "Review date",
    cell: ({ row }) => row.original.document.nextReviewDate ?? "—",
  },
  {
    id: "overall",
    header: "Overall readiness",
    cell: ({ row }) => <Badge tone={READINESS_TONE[row.original.overall]}>{READINESS_LABEL[row.original.overall]}</Badge>,
  },
  {
    id: "blockers",
    header: "Blocking reasons",
    cell: ({ row }) =>
      row.original.blockers.length > 0 ? (
        <span className="text-xs text-muted-foreground">{row.original.blockers.join(" ")}</span>
      ) : (
        <span className="text-xs text-success">None</span>
      ),
  },
];

export function RagReadinessTab({ documents }: { documents: DocumentRecord[] | undefined }) {
  const summary = useRagReadinessSummary();
  const [filter, setFilter] = useState<ReadinessFilter>("all");

  const rows: ReadinessRow[] | undefined = useMemo(
    () =>
      documents?.map((document) => ({
        document,
        overall: getOverallReadiness(document),
        blockers: Array.from(new Set([...getPublicationBlockers(document), ...getAiEligibilityBlockers(document)])),
      })),
    [documents]
  );

  const filteredRows = useMemo(() => {
    if (!rows) return rows;
    if (filter === "all") return rows;
    if (filter === "ai_permission_missing") return rows.filter((r) => !r.document.aiUsagePermission);
    return rows.filter((r) => r.overall === filter);
  }, [rows, filter]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Total documents", value: summary?.totalDocuments },
          { label: "Locally processed", value: summary?.locallyProcessed },
          { label: "Ready for AI processing", value: summary?.readyForAiProcessing },
          { label: "Published & AI permitted", value: summary?.publishedAiPermitted },
          { label: "Awaiting legal review", value: summary?.awaitingLegalReview },
          { label: "Missing AI permission", value: summary?.missingAiPermission },
          { label: "Processing issues", value: summary?.processingIssues },
          { label: "Overdue for review", value: summary?.overdueForReview },
          { label: "Archived", value: summary?.archived },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xl font-bold text-foreground">{stat.value ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Filter by readiness</legend>
        {(
          [
            ["all", "All"],
            ["ready", "Ready"],
            ["blocked", "Blocked"],
            ["awaiting_review", "Awaiting review"],
            ["processing_issue", "Processing issue"],
            ["ai_permission_missing", "AI permission missing"],
          ] as [ReadinessFilter, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              filter === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </fieldset>

      <DataTable
        caption="Document readiness"
        columns={columns}
        data={filteredRows}
        searchPlaceholder="Search readiness..."
        emptyTitle="No documents match this filter"
        pageSizeStorageKey="safespeak-admin:rag-readiness:page-size"
      />

      <p className="text-xs text-muted-foreground">
        Ready for future AI processing — not indexed in a production RAG system.
      </p>
    </div>
  );
}
