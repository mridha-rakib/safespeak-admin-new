import { z } from "zod";

import { baseRecordSchema } from "@/lib/models/base";

/**
 * Knowledge & Legislation source document. `status` (from BaseRecord) is the
 * single source of truth for publication state — there is no separate
 * "publicationStatus" field, to avoid two status values drifting apart.
 */
export const DOCUMENT_SOURCE_TYPES = [
  "legislation",
  "regulation",
  "policy",
  "guideline",
  "case_law",
  "other",
] as const;
export type DocumentSourceType = (typeof DOCUMENT_SOURCE_TYPES)[number];

export const DOCUMENT_LICENSE_STATUSES = [
  "public_domain",
  "government_open_license",
  "restricted_internal_use",
  "requires_permission",
  "unknown",
] as const;
export type DocumentLicenseStatus = (typeof DOCUMENT_LICENSE_STATUSES)[number];

export const DOCUMENT_PRIORITIES = ["low", "medium", "high"] as const;
export type DocumentPriority = (typeof DOCUMENT_PRIORITIES)[number];

/**
 * Local-only processing pipeline states. These describe browser-side text
 * extraction and chunk preview, NOT a production RAG/embedding pipeline —
 * see lib/pdf/extract-pdf.ts and the README for the exact user-facing wording.
 */
export const DOCUMENT_PROCESSING_STATUSES = [
  "not_processed",
  "processing",
  "ready_for_ai_processing",
  "processing_issue",
] as const;
export type DocumentProcessingStatus = (typeof DOCUMENT_PROCESSING_STATUSES)[number];

export const DOCUMENT_EXTRACTION_STATUSES = [
  "not_extracted",
  "extracting",
  "extracted",
  "extraction_failed",
] as const;
export type DocumentExtractionStatus = (typeof DOCUMENT_EXTRACTION_STATUSES)[number];

export const DOCUMENT_LOCAL_PREVIEW_STATUSES = ["unavailable", "available"] as const;
export type DocumentLocalPreviewStatus = (typeof DOCUMENT_LOCAL_PREVIEW_STATUSES)[number];

export const documentFileMetaSchema = z.object({
  fileName: z.string().min(1),
  fileSizeBytes: z.number().int().nonnegative(),
  fileType: z.string().min(1),
  pageCount: z.number().int().nonnegative().optional(),
});
export type DocumentFileMeta = z.infer<typeof documentFileMetaSchema>;

export const documentSchema = baseRecordSchema.extend({
  title: z.string().min(1),
  legislationName: z.string().optional(),
  file: documentFileMetaSchema.optional(),
  sourceType: z.enum(DOCUMENT_SOURCE_TYPES).default("legislation"),
  sourceCategory: z.string().optional(),
  authorityOrPublisher: z.string().optional(),
  jurisdiction: z.string().optional(),
  language: z.string().default("en"),
  actNumber: z.string().optional(),
  documentVersionLabel: z.string().optional(),
  sourceUrl: z.url().optional().or(z.literal("")),
  effectiveDate: z.string().optional(),
  lastUpdatedDate: z.string().optional(),
  nextReviewDate: z.string().optional(),
  licenseStatus: z.enum(DOCUMENT_LICENSE_STATUSES).default("unknown"),
  relevantSections: z.array(z.string()).default([]),
  topic: z.string().optional(),
  tags: z.array(z.string()).default([]),
  incidentTypeIds: z.array(z.string()).default([]),
  priority: z.enum(DOCUMENT_PRIORITIES).default("medium"),
  aiUsagePermission: z.boolean().default(false),
  legalReviewComplete: z.boolean().default(false),
  reviewNotes: z.string().optional(),
  processingStatus: z.enum(DOCUMENT_PROCESSING_STATUSES).default("not_processed"),
  extractionStatus: z.enum(DOCUMENT_EXTRACTION_STATUSES).default("not_extracted"),
  localPreviewStatus: z.enum(DOCUMENT_LOCAL_PREVIEW_STATUSES).default("unavailable"),
  extractedTextPreview: z.string().optional(),
  processingIssue: z.string().optional(),
});
export type DocumentRecord = z.infer<typeof documentSchema> & {
  /** Raw PDF bytes, stored directly in IndexedDB by Dexie. Never present in JSON bundle exports. */
  fileBlob?: Blob;
};

/** Legislation may only publish once legal review is complete — see lib/publishing/workflow.ts. */
export function canPublishDocument(doc: Pick<DocumentRecord, "legalReviewComplete">): boolean {
  return doc.legalReviewComplete;
}

export const documentChunkSchema = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),
  pageStart: z.number().int().positive().optional(),
  pageEnd: z.number().int().positive().optional(),
  chunkIndex: z.number().int().nonnegative(),
  text: z.string(),
  characterCount: z.number().int().nonnegative(),
  localOnly: z.literal(true).default(true),
  createdAt: z.string().min(1),
});
export type DocumentChunk = z.infer<typeof documentChunkSchema>;
