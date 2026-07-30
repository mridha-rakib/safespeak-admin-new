import type { DocumentRecord } from "@/lib/models/document";

/**
 * Single source of truth for "is this legislation record good enough to
 * do X" questions. Forms, tables, the detail page, the RAG readiness tab,
 * and the bundle export serializer all call into this file rather than
 * re-implementing the same checks — see docs/ARCHITECTURE.md "Legislation
 * eligibility rules."
 */

export interface ReadinessCheck {
  key: string;
  label: string;
  met: boolean;
}

function hasText(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Step 2 "Source information" required fields — gates Ready for review, not Draft. */
export function isRequiredMetadataComplete(doc: DocumentRecord): boolean {
  return (
    hasText(doc.title) &&
    hasText(doc.sourceType) &&
    hasText(doc.sourceCategory) &&
    hasText(doc.authorityOrPublisher) &&
    hasText(doc.jurisdiction) &&
    hasText(doc.language)
  );
}

export function hasLocalFile(doc: DocumentRecord): boolean {
  return Boolean(doc.file);
}

export function hasSuccessfulExtraction(doc: DocumentRecord): boolean {
  return doc.extractionStatus === "extracted" && doc.localPreviewStatus === "available";
}

export function hasBlockingProcessingIssue(doc: DocumentRecord): boolean {
  return doc.processingStatus === "processing_issue";
}

export function isLicenseStatusSelected(doc: DocumentRecord): boolean {
  return Boolean(doc.licenseStatus) && doc.licenseStatus !== "unknown";
}

export function hasNextReviewDate(doc: DocumentRecord): boolean {
  return hasText(doc.nextReviewDate);
}

/**
 * "Legislation publication rule" (README/spec): everything required to move
 * a record to `published`. Deliberately does NOT require AI permission,
 * license status, or a review date — those gate AI-ready export and the RAG
 * readiness checklist, not publication itself. Returns an empty array when
 * publish is allowed.
 */
export function getPublicationBlockers(doc: DocumentRecord): string[] {
  const blockers: string[] = [];

  if (!hasLocalFile(doc)) blockers.push("No PDF has been uploaded.");
  if (!hasSuccessfulExtraction(doc)) blockers.push("Local text extraction has not succeeded yet.");
  if (!isRequiredMetadataComplete(doc)) {
    blockers.push("Required source information (title, source type, source category, authority, jurisdiction, language) is incomplete.");
  }
  if (!doc.legalReviewComplete) blockers.push("Legal review is not marked complete.");
  if (hasBlockingProcessingIssue(doc)) blockers.push("A local processing issue has not been resolved.");

  return blockers;
}

export function isPublishable(doc: DocumentRecord): boolean {
  return getPublicationBlockers(doc).length === 0;
}

/**
 * "AI eligibility rule": what a published legislation record additionally
 * needs before it is eligible for the AI-ready (Published Content Bundle)
 * export. Independent of publication — see README "AI Usage Permission and
 * Published are not the same thing."
 */
export function getAiEligibilityBlockers(doc: DocumentRecord): string[] {
  const blockers: string[] = [];

  if (doc.status !== "published") blockers.push("The record is not published.");
  if (doc.status === "archived") blockers.push("The record is archived.");
  if (!doc.aiUsagePermission) blockers.push("AI usage permission has not been granted.");
  if (!doc.legalReviewComplete) blockers.push("Legal review is not marked complete.");
  if (!hasSuccessfulExtraction(doc)) blockers.push("Local text extraction has not succeeded.");
  if (hasBlockingProcessingIssue(doc)) blockers.push("A local processing issue has not been resolved.");

  return blockers;
}

export function isAiEligible(doc: DocumentRecord): boolean {
  return getAiEligibilityBlockers(doc).length === 0;
}

/** Purely a date check — the caller decides when it's meaningful to show the badge. */
export function isReviewOverdue(doc: DocumentRecord, referenceDate: Date = new Date()): boolean {
  if (!hasText(doc.nextReviewDate)) return false;
  const reviewDate = new Date(doc.nextReviewDate);
  if (Number.isNaN(reviewDate.getTime())) return false;
  return reviewDate.getTime() < referenceDate.getTime();
}

/** The plain-language checklist shown on the detail page and the RAG Readiness tab. */
export function getRagReadinessChecklist(doc: DocumentRecord): ReadinessCheck[] {
  return [
    { key: "file", label: "Local file available", met: hasLocalFile(doc) },
    { key: "extraction", label: "Local text extracted", met: hasSuccessfulExtraction(doc) },
    { key: "chunks", label: "Local chunks generated", met: hasSuccessfulExtraction(doc) },
    { key: "metadata", label: "Required metadata complete", met: isRequiredMetadataComplete(doc) },
    { key: "legalReview", label: "Legal review complete", met: doc.legalReviewComplete },
    { key: "aiPermission", label: "AI use allowed", met: doc.aiUsagePermission },
    { key: "published", label: "Published", met: doc.status === "published" },
    { key: "noIssues", label: "No unresolved processing issue", met: !hasBlockingProcessingIssue(doc) },
  ];
}

export type OverallReadiness = "ready" | "blocked" | "awaiting_review" | "processing_issue";

/** One overall label per document, driven by the same blocker logic — never recomputed ad hoc in a table cell. */
export function getOverallReadiness(doc: DocumentRecord): OverallReadiness {
  if (hasBlockingProcessingIssue(doc)) return "processing_issue";
  if (isAiEligible(doc)) return "ready";
  if (doc.status === "draft" || doc.status === "ready_for_review") return "awaiting_review";
  return "blocked";
}

export interface RagReadinessSummary {
  totalDocuments: number;
  locallyProcessed: number;
  readyForAiProcessing: number;
  publishedAiPermitted: number;
  awaitingLegalReview: number;
  missingAiPermission: number;
  processingIssues: number;
  overdueForReview: number;
  archived: number;
}

/** Pure aggregation over an already-fetched document list — used by the repository's getRagReadinessSummary and directly by tests. */
export function summarizeReadiness(docs: DocumentRecord[]): RagReadinessSummary {
  return {
    totalDocuments: docs.length,
    locallyProcessed: docs.filter(hasSuccessfulExtraction).length,
    readyForAiProcessing: docs.filter((d) => d.processingStatus === "ready_for_ai_processing").length,
    publishedAiPermitted: docs.filter(isAiEligible).length,
    awaitingLegalReview: docs.filter((d) => !d.legalReviewComplete).length,
    missingAiPermission: docs.filter((d) => !d.aiUsagePermission).length,
    processingIssues: docs.filter(hasBlockingProcessingIssue).length,
    overdueForReview: docs.filter((d) => isReviewOverdue(d)).length,
    archived: docs.filter((d) => d.status === "archived").length,
  };
}
