"use client";

import { IconCircleCheck, IconAlertTriangle, IconDownload } from "@tabler/icons-react";
import Link from "next/link";
import { use, useState } from "react";

import { ChunkPreviewList } from "@/components/legislation/detail/chunk-preview-list";
import { DocumentStatusActions } from "@/components/legislation/detail/document-status-actions";
import { PageHeader } from "@/components/layout/page-header";
import { useAdminRepository } from "@/components/providers/repository-provider";
import { auditEventColumns } from "@/components/table/audit-event-columns";
import { DataTable } from "@/components/table/data-table";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentStatusBadge } from "@/components/ui/status-badge";
import { useDocument } from "@/hooks/use-document";
import { useDocumentAuditEvents } from "@/hooks/use-document-audit-events";
import { useDocumentChunks } from "@/hooks/use-document-chunks";
import { downloadBlob } from "@/lib/bundle/download-bundle";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import { getRagReadinessChecklist, isReviewOverdue } from "@/lib/legislation/readiness";
import type { DocumentRecord } from "@/lib/models/document";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-1.5 text-sm sm:grid-cols-3 sm:gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="sm:col-span-2 text-foreground">{value && value.length > 0 ? value : "Not set"}</dd>
    </div>
  );
}

export default function DocumentDetailPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = use(params);
  const { repository } = useAdminRepository();
  const [document, setDocument] = useState<DocumentRecord | null | undefined>(undefined);
  const liveDocument = useDocument(documentId);
  const chunks = useDocumentChunks(documentId);
  const auditEvents = useDocumentAuditEvents(documentId);
  const [textExpanded, setTextExpanded] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const doc = document ?? liveDocument;

  if (doc === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (doc === null) {
    return (
      <EmptyState
        title="Document not found"
        description="This document doesn't exist locally, or it was removed. Check the Knowledge & Legislation list."
        action={
          <Link href="/content/knowledge-legislation" className={buttonVariants({ variant: "outline" })}>
            Back to Knowledge & Legislation
          </Link>
        }
      />
    );
  }

  const checklist = getRagReadinessChecklist(doc);
  const overdue = isReviewOverdue(doc);
  const preview = doc.extractedTextPreview ?? "";
  const shortPreview = preview.length > 400 && !textExpanded ? `${preview.slice(0, 400)}…` : preview;

  async function handleDownload() {
    if (!repository) return;
    setDownloadError(null);
    const blob = await repository.documents.getFileBlob(doc!.id);
    if (!blob || !doc!.file) {
      setDownloadError("No local file is stored for this document.");
      return;
    }
    downloadBlob(blob, doc!.file.fileName);
  }

  return (
    <>
      <PageHeader
        title={doc.title}
        description={doc.legislationName}
        actions={
          <Link href={`/content/knowledge-legislation/${doc.id}/edit`} className={buttonVariants({ variant: "outline" })}>
            Edit
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <ContentStatusBadge status={doc.status} />
        <Badge tone={doc.processingStatus === "ready_for_ai_processing" ? "success" : doc.processingStatus === "processing_issue" ? "warning" : "neutral"}>
          {doc.processingStatus.replace(/_/g, " ")}
        </Badge>
        <Badge tone={doc.aiUsagePermission ? "success" : "neutral"}>{doc.aiUsagePermission ? "AI use allowed" : "AI use not allowed"}</Badge>
        <Badge tone={doc.legalReviewComplete ? "success" : "warning"}>
          {doc.legalReviewComplete ? "Legal review complete" : "Needs legal review"}
        </Badge>
        {doc.isDemo ? <Badge tone="neutral">Demo</Badge> : null}
        {overdue ? <Badge tone="warning">Overdue for review</Badge> : null}
      </div>

      <DocumentStatusActions document={doc} onChanged={setDocument} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Source information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="Source type" value={doc.sourceType.replace(/_/g, " ")} />
              <DetailRow label="Source category" value={doc.sourceCategory} />
              <DetailRow label="Authority / publisher" value={doc.authorityOrPublisher} />
              <DetailRow label="Jurisdiction" value={jurisdictionLabel(doc.jurisdiction)} />
              <DetailRow label="Language" value={doc.language} />
              <DetailRow label="Act number" value={doc.actNumber} />
              <DetailRow label="Version" value={doc.documentVersionLabel} />
              <DetailRow label="Source URL" value={doc.sourceUrl} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dates and governance</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="Effective date" value={doc.effectiveDate} />
              <DetailRow label="Last updated" value={doc.lastUpdatedDate} />
              <DetailRow
                label="Next review date"
                value={doc.nextReviewDate ? `${doc.nextReviewDate}${overdue ? " (overdue)" : ""}` : undefined}
              />
              <DetailRow label="License status" value={doc.licenseStatus.replace(/_/g, " ")} />
              <DetailRow label="Priority" value={doc.priority} />
            </dl>
            {doc.reviewNotes ? (
              <p className="mt-3 rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Review notes: </span>
                {doc.reviewNotes}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Legal scope</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="Topic" value={doc.topic} />
              <DetailRow label="Relevant sections" value={doc.relevantSections.join("; ")} />
              <DetailRow label="Tags" value={doc.tags.join(", ")} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Source file</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {doc.file ? (
              <dl>
                <DetailRow label="File name" value={doc.file.fileName} />
                <DetailRow label="File size" value={formatBytes(doc.file.fileSizeBytes)} />
                <DetailRow label="Page count" value={doc.file.pageCount?.toString()} />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">No file has been uploaded yet.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {doc.file ? (
                <button
                  type="button"
                  onClick={handleDownload}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <IconDownload size={14} aria-hidden="true" />
                  Download local PDF
                </button>
              ) : null}
              <Link
                href={`/content/knowledge-legislation/${doc.id}/edit`}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Replace file
              </Link>
            </div>
            {downloadError ? (
              <Alert tone="destructive" title="Could not download file" role="alert">
                {downloadError}
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Local text preview</CardTitle>
        </CardHeader>
        <CardContent>
          {preview ? (
            <>
              <p className="whitespace-pre-wrap break-words text-sm text-foreground">{shortPreview}</p>
              {preview.length > 400 ? (
                <button
                  type="button"
                  onClick={() => setTextExpanded((v) => !v)}
                  className="mt-2 text-sm font-semibold text-primary hover:underline"
                >
                  {textExpanded ? "Show less" : "Show more"}
                </button>
              ) : null}
            </>
          ) : (
            <EmptyState title="No local text preview yet" description="Upload or replace the PDF to generate one." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Local chunk preview</CardTitle>
        </CardHeader>
        <CardContent>
          <ChunkPreviewList chunks={chunks ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>RAG readiness checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {checklist.map((item) => (
              <li key={item.key} className="flex items-center gap-2 text-sm">
                {item.met ? (
                  <IconCircleCheck size={16} className="text-success" aria-hidden="true" />
                ) : (
                  <IconAlertTriangle size={16} className="text-warning" aria-hidden="true" />
                )}
                <span className={item.met ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Ready for future AI processing only reflects local readiness — it is not indexed in a
            production RAG system.
          </p>
        </CardContent>
      </Card>

      <section aria-labelledby="document-audit-heading" className="space-y-3">
        <h2 id="document-audit-heading" className="text-lg font-semibold text-foreground">
          Audit activity
        </h2>
        <DataTable
          caption={`Audit activity for ${doc.title}`}
          columns={auditEventColumns}
          data={auditEvents}
          searchPlaceholder="Search audit activity..."
          emptyTitle="No activity recorded yet"
          pageSizeStorageKey="safespeak-admin:document-audit:page-size"
        />
      </section>
    </>
  );
}
