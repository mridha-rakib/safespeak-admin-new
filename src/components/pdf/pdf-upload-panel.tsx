"use client";

import { IconFileUpload, IconLoader2 } from "@tabler/icons-react";
import { useId, useRef, useState } from "react";

import { useAdminRepository } from "@/components/providers/repository-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createAuditEvent } from "@/lib/models/audit-event";
import { createBaseFields, LOCAL_ADMIN_ACTOR } from "@/lib/models/base";
import type { DocumentRecord } from "@/lib/models/document";
import { extractPdfText, PdfExtractionError, type PdfExtractionProgress } from "@/lib/pdf/extract-pdf";
import { DEFAULT_PDF_MAX_BYTES, validatePdfFile } from "@/lib/pdf/validate-pdf-file";
import { useAppSettings } from "@/hooks/use-app-settings";

type UploadStage = "idle" | "validating" | "extracting" | "done" | "error";

export function PdfUploadPanel({ onDocumentReady }: { onDocumentReady?: (doc: DocumentRecord) => void }) {
  const { repository } = useAdminRepository();
  const settings = useAppSettings();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<UploadStage>("idle");
  const [progress, setProgress] = useState<PdfExtractionProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const maxBytes = settings?.pdfMaxFileSizeBytes ?? DEFAULT_PDF_MAX_BYTES;

  async function handleFile(file: File) {
    if (!repository) return;

    setFileName(file.name);
    setStage("validating");
    setMessage(null);

    const validation = validatePdfFile(file, maxBytes);
    if (!validation.valid) {
      setStage("error");
      setMessage(validation.reason ?? "This file can't be used.");
      return;
    }

    const draft: DocumentRecord = {
      ...createBaseFields(),
      title: file.name.replace(/\.pdf$/i, ""),
      file: { fileName: file.name, fileSizeBytes: file.size, fileType: file.type || "application/pdf" },
      sourceType: "other",
      language: "en",
      licenseStatus: "unknown",
      relevantSections: [],
      tags: [],
      incidentTypeIds: [],
      priority: "medium",
      aiUsagePermission: false,
      legalReviewComplete: false,
      processingStatus: "processing",
      extractionStatus: "extracting",
      localPreviewStatus: "unavailable",
    };

    const created = await repository.documents.create(draft);
    await repository.documents.setFileBlob(created.id, file);

    setStage("extracting");
    setProgress({ pagesProcessed: 0, totalPages: 0 });

    try {
      const result = await extractPdfText(file, created.id, (p) => setProgress(p));

      await repository.documents.update(created.id, {
        processingStatus: "ready_for_ai_processing",
        extractionStatus: "extracted",
        localPreviewStatus: "available",
        extractedTextPreview: result.preview,
        file: { fileName: file.name, fileSizeBytes: file.size, fileType: file.type || "application/pdf", pageCount: result.pageCount },
      });
      await repository.documentChunks.replaceForDocument(created.id, result.chunks);
      await repository.auditEvents.append(
        createAuditEvent({
          entityType: "document",
          entityId: created.id,
          action: "created",
          actor: LOCAL_ADMIN_ACTOR,
          nextStatus: created.status,
          summary: `Uploaded and locally previewed "${created.title}" (${result.pageCount} pages, ${result.chunks.length} local chunks).`,
          isDemo: false,
        })
      );

      setStage("done");
      setMessage(
        `Local text preview ready: ${result.pageCount} page${result.pageCount === 1 ? "" : "s"}, ${result.chunks.length} local chunk preview${result.chunks.length === 1 ? "" : "s"} generated. Not indexed in a production RAG system.`
      );
      onDocumentReady?.(created);
    } catch (error) {
      const issue =
        error instanceof PdfExtractionError
          ? error.message
          : "An unexpected error stopped local text extraction for this file.";

      await repository.documents.update(created.id, {
        processingStatus: "processing_issue",
        extractionStatus: "extraction_failed",
        localPreviewStatus: "unavailable",
        processingIssue: issue,
      });

      setStage("error");
      setMessage(issue);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const maxMb = Math.round(maxBytes / (1024 * 1024));

  return (
    <div className="space-y-4 rounded-xl border border-dashed border-border bg-secondary/30 p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <IconFileUpload size={20} aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold text-foreground">Upload a document for local preview</p>
          <p className="text-sm text-muted-foreground">
            PDF only, up to {maxMb}MB. This extracts text and generates a local chunk preview in your
            browser — it does not create embeddings, does not call a server, and is not production RAG
            indexing.
          </p>
        </div>
      </div>

      <div>
        <label htmlFor={inputId} className="sr-only">
          Choose a PDF file
        </label>
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept="application/pdf,.pdf"
          disabled={!repository || stage === "extracting" || stage === "validating"}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:bg-safe-blue-dark"
        />
      </div>

      {stage === "extracting" ? (
        <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
          <IconLoader2 size={16} className="animate-spin" aria-hidden="true" />
          <span>
            Extracting text from {fileName ?? "your file"}
            {progress && progress.totalPages > 0
              ? ` — page ${progress.pagesProcessed} of ${progress.totalPages}`
              : "…"}
          </span>
        </div>
      ) : null}

      {stage === "done" && message ? (
        <Alert tone="success" title="Local preview ready">
          {message}
        </Alert>
      ) : null}

      {stage === "error" && message ? (
        <Alert tone="destructive" title="This file could not be locally previewed" role="alert">
          {message}
        </Alert>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={stage === "extracting" || stage === "validating"}
        onClick={() => fileInputRef.current?.click()}
      >
        Choose PDF file
      </Button>
    </div>
  );
}
