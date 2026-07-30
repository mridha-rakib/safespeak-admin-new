import { isReviewOverdue } from "@/lib/legislation/readiness";
import type { ContentStatus } from "@/lib/models/base";
import type { DocumentProcessingStatus, DocumentRecord, DocumentSourceType } from "@/lib/models/document";

export interface DocumentFilterState {
  status: ContentStatus | "all";
  jurisdiction: string | "all";
  sourceType: DocumentSourceType | "all";
  processingStatus: DocumentProcessingStatus | "all";
  aiUsage: "all" | "allowed" | "not_allowed";
  legalReview: "all" | "complete" | "incomplete";
  reviewDue: "all" | "overdue";
}

export const DEFAULT_DOCUMENT_FILTERS: DocumentFilterState = {
  status: "all",
  jurisdiction: "all",
  sourceType: "all",
  processingStatus: "all",
  aiUsage: "all",
  legalReview: "all",
  reviewDue: "all",
};

export function isDocumentFilterActive(filters: DocumentFilterState): boolean {
  return Object.entries(filters).some(([, value]) => value !== "all");
}

export function applyDocumentFilters(documents: DocumentRecord[], filters: DocumentFilterState): DocumentRecord[] {
  return documents.filter((doc) => {
    if (filters.status !== "all" && doc.status !== filters.status) return false;
    if (filters.jurisdiction !== "all" && doc.jurisdiction !== filters.jurisdiction) return false;
    if (filters.sourceType !== "all" && doc.sourceType !== filters.sourceType) return false;
    if (filters.processingStatus !== "all" && doc.processingStatus !== filters.processingStatus) return false;
    if (filters.aiUsage === "allowed" && !doc.aiUsagePermission) return false;
    if (filters.aiUsage === "not_allowed" && doc.aiUsagePermission) return false;
    if (filters.legalReview === "complete" && !doc.legalReviewComplete) return false;
    if (filters.legalReview === "incomplete" && doc.legalReviewComplete) return false;
    if (filters.reviewDue === "overdue" && !isReviewOverdue(doc)) return false;
    return true;
  });
}
