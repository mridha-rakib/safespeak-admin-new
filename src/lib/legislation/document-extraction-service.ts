import { createAuditEvent } from "@/lib/models/audit-event";
import { createBaseFields } from "@/lib/models/base";
import type { DocumentFileMeta, DocumentRecord } from "@/lib/models/document";
import { extractPdfText, PdfExtractionError, type PdfExtractionProgress } from "@/lib/pdf/extract-pdf";
import type { AdminContentRepository } from "@/lib/repositories/admin-content-repository";

/**
 * The single place that orchestrates "run local extraction, then commit the
 * outcome." The document create wizard, the detail page's Replace PDF
 * action, and the Processing Issues tab's Retry action all call into this
 * file instead of re-implementing the same validate/extract/commit sequence
 * three times.
 */

export interface ExtractionOutcome {
  success: boolean;
  document?: DocumentRecord;
  error?: string;
}

function fileMetaFrom(file: File): DocumentFileMeta {
  return { fileName: file.name, fileSizeBytes: file.size, fileType: file.type || "application/pdf" };
}

type CommitMode = "created" | "replaced" | "retried";

async function commitExtraction(
  repository: AdminContentRepository,
  documentId: string,
  file: File,
  title: string,
  mode: CommitMode,
  actor: string,
  onProgress?: (progress: PdfExtractionProgress) => void
): Promise<ExtractionOutcome> {
  try {
    const result = await extractPdfText(file, documentId, onProgress);

    const summaryByMode: Record<CommitMode, string> = {
      created: `Uploaded and locally previewed "${title}" (${result.pageCount} pages, ${result.chunks.length} local chunks). Not indexed in a production RAG system.`,
      replaced: `Replaced the local file for "${title}" and regenerated ${result.chunks.length} local chunks.`,
      retried: `Retried local extraction for "${title}" — succeeded with ${result.chunks.length} local chunks.`,
    };

    const document = await repository.documents.applyExtractionResult(
      documentId,
      {
        file: { ...fileMetaFrom(file), pageCount: result.pageCount },
        blob: file,
        chunks: result.chunks,
        extractedTextPreview: result.preview,
        processingStatus: "ready_for_ai_processing",
        extractionStatus: "extracted",
      },
      { action: mode === "created" ? "created" : "updated", summary: summaryByMode[mode], actor }
    );

    return { success: true, document };
  } catch (error) {
    const issue =
      error instanceof PdfExtractionError
        ? error.message
        : "An unexpected error stopped local text extraction for this file.";

    if (mode === "created") {
      // A new document always ends up persisted, even on failure — that's
      // what lets the Processing Issues tab show it and offer a retry.
      const document = await repository.documents.applyExtractionResult(
        documentId,
        {
          file: fileMetaFrom(file),
          blob: file,
          chunks: [],
          processingStatus: "processing_issue",
          extractionStatus: "extraction_failed",
          processingIssue: issue,
        },
        { action: "created", summary: `Uploaded "${title}" — local extraction failed: ${issue}`, actor }
      );
      return { success: false, error: issue, document };
    }

    // Replacing or retrying: never touch the previously valid file/chunks —
    // just record that the attempt failed.
    await repository.auditEvents.append(
      createAuditEvent({
        entityType: "document",
        entityId: documentId,
        action: "updated",
        actor,
        summary: `${mode === "replaced" ? "Replacing the file for" : "Retrying extraction for"} "${title}" failed: ${issue} The previous local file and chunks were kept.`,
        isDemo: false,
      })
    );
    return { success: false, error: issue };
  }
}

export interface CreateDocumentInput {
  file: File;
  metadata?: Partial<DocumentRecord>;
  actor: string;
}

/** Creates the document row first (so it's visible even if extraction fails), then runs extraction and commits the outcome. */
export async function createDocumentFromFile(
  repository: AdminContentRepository,
  input: CreateDocumentInput,
  onProgress?: (progress: PdfExtractionProgress) => void
): Promise<ExtractionOutcome> {
  const title = input.metadata?.title?.trim() || input.file.name.replace(/\.pdf$/i, "");

  const draft: DocumentRecord = {
    ...createBaseFields({ status: "draft" }),
    sourceType: "legislation",
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
    ...input.metadata,
    title,
  };

  const created = await repository.documents.create(draft);
  return commitExtraction(repository, created.id, input.file, title, "created", input.actor, onProgress);
}

/** Detail-page "Replace PDF" — only commits when the new extraction succeeds. */
export async function replaceDocumentFile(
  repository: AdminContentRepository,
  documentId: string,
  newFile: File,
  actor: string,
  onProgress?: (progress: PdfExtractionProgress) => void
): Promise<ExtractionOutcome> {
  const doc = await repository.documents.get(documentId);
  if (!doc) return { success: false, error: "This document could not be found." };
  return commitExtraction(repository, documentId, newFile, doc.title, "replaced", actor, onProgress);
}

/** Processing Issues tab "Retry extraction" — reuses the already-stored blob, no new file selected. */
export async function retryExtraction(
  repository: AdminContentRepository,
  documentId: string,
  actor: string,
  onProgress?: (progress: PdfExtractionProgress) => void
): Promise<ExtractionOutcome> {
  const doc = await repository.documents.get(documentId);
  if (!doc) return { success: false, error: "This document could not be found." };

  const blob = await repository.documents.getFileBlob(documentId);
  if (!blob) {
    return { success: false, error: "No local file is stored for this document. Replace the file instead." };
  }

  const file = new File([blob], doc.file?.fileName ?? "document.pdf", {
    type: doc.file?.fileType ?? "application/pdf",
  });
  return commitExtraction(repository, documentId, file, doc.title, "retried", actor, onProgress);
}
