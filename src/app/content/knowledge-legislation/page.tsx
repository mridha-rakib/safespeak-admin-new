"use client";

import { IconFlask2, IconSearch } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";

import { PageHeader } from "@/components/layout/page-header";
import { PdfUploadPanel } from "@/components/pdf/pdf-upload-panel";
import { DataTable } from "@/components/table/data-table";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ContentStatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDocuments } from "@/hooks/use-documents";
import type { DocumentRecord } from "@/lib/models/document";

const PROCESSING_LABEL: Record<DocumentRecord["processingStatus"], string> = {
  not_processed: "Not processed",
  processing: "Processing…",
  ready_for_ai_processing: "Ready for AI processing",
  processing_issue: "Processing issue",
};

const documentColumns: ColumnDef<DocumentRecord, unknown>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-foreground">{row.original.title}</p>
        <p className="text-xs text-muted-foreground">{row.original.sourceType.replace(/_/g, " ")}</p>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => <ContentStatusBadge status={getValue<DocumentRecord["status"]>()} />,
  },
  {
    accessorKey: "processingStatus",
    header: "AI processing",
    cell: ({ getValue }) => {
      const value = getValue<DocumentRecord["processingStatus"]>();
      return (
        <Badge tone={value === "ready_for_ai_processing" ? "success" : value === "processing_issue" ? "warning" : "neutral"}>
          {PROCESSING_LABEL[value]}
        </Badge>
      );
    },
  },
  {
    accessorKey: "isDemo",
    header: "Demo",
    cell: ({ getValue }) => (getValue<boolean>() ? <Badge tone="neutral">Demo</Badge> : null),
  },
];

export default function KnowledgeLegislationPage() {
  const documents = useDocuments();
  const readyDocs = documents?.filter((d) => d.processingStatus === "ready_for_ai_processing") ?? [];
  const notReadyDocs = documents?.filter((d) => d.processingStatus !== "ready_for_ai_processing") ?? [];
  const issueDocs = documents?.filter((d) => d.processingStatus === "processing_issue") ?? [];

  return (
    <>
      <PageHeader
        title="Knowledge & Legislation"
        description="Source documents and legislation, with a local text-preview and chunk-preview foundation for future AI processing."
      />

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="upload">Upload document</TabsTrigger>
          <TabsTrigger value="rag-readiness">RAG readiness</TabsTrigger>
          <TabsTrigger value="processing-issues">Processing issues</TabsTrigger>
          <TabsTrigger value="test-retrieval">Test retrieval</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <DataTable
            caption="Knowledge and legislation documents"
            columns={documentColumns}
            data={documents}
            searchPlaceholder="Search documents..."
            emptyTitle="No documents yet"
            emptyDescription="Upload a PDF from the Upload document tab to get started."
            pageSizeStorageKey="safespeak-admin:knowledge-documents:page-size"
          />
        </TabsContent>

        <TabsContent value="upload">
          <PdfUploadPanel />
        </TabsContent>

        <TabsContent value="rag-readiness">
          <div className="space-y-4">
            <Alert tone="info" title="What &quot;Ready for AI processing&quot; means here">
              A document is marked ready once its text has been successfully extracted and chunked
              locally. This is a local readiness signal only — it does not mean the document has been
              embedded or added to a production AI knowledge base. Nothing here calls a server.
            </Alert>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <CardContent className="p-5">
                  <p className="text-2xl font-bold text-foreground">{readyDocs.length}</p>
                  <p className="text-sm text-muted-foreground">Ready for AI processing</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-2xl font-bold text-foreground">{notReadyDocs.length}</p>
                  <p className="text-sm text-muted-foreground">Not yet ready</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="processing-issues">
          {issueDocs.length === 0 ? (
            <EmptyState
              icon={IconFlask2}
              title="No processing issues"
              description="Documents that fail local extraction (encrypted, empty, or unreadable files) will be listed here."
            />
          ) : (
            <ul className="space-y-3">
              {issueDocs.map((doc) => (
                <li key={doc.id}>
                  <Alert tone="warning" title={doc.title}>
                    {doc.processingIssue ?? "This document could not be processed locally."}
                  </Alert>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="test-retrieval">
          <div className="space-y-4">
            <Alert tone="info" title="Not implemented in this phase">
              There is no production retrieval or AI answer generation in safespeak-admin. This tab is a
              placeholder for a later phase where a real retrieval pipeline can be tested against
              published, AI-approved content.
            </Alert>
            <label className="relative block max-w-md">
              <span className="sr-only">Test retrieval query (disabled)</span>
              <IconSearch
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input disabled placeholder="Test retrieval will be available in a later phase" className="pl-9" />
            </label>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
