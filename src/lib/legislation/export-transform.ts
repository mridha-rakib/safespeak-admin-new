import { isAiEligible } from "@/lib/legislation/readiness";
import type { DocumentRecord } from "@/lib/models/document";

/**
 * Public export shape for a published legislation record — deliberately a
 * field allow-list (not "everything minus a few keys") so a new internal
 * field added to DocumentRecord later doesn't leak into the export by
 * default. Excludes `reviewNotes`, `processingIssue`, `createdBy`/`updatedBy`,
 * and every local processing/extraction status field — none of that is
 * needed by (or appropriate for) a frontend consumer.
 */
export interface PublishedLegislationExport {
  id: string;
  title: string;
  legislationName?: string;
  sourceType: DocumentRecord["sourceType"];
  sourceCategory?: string;
  authorityOrPublisher?: string;
  jurisdiction?: string;
  language: string;
  actNumber?: string;
  documentVersionLabel?: string;
  sourceUrl?: string;
  effectiveDate?: string;
  lastUpdatedDate?: string;
  nextReviewDate?: string;
  licenseStatus: DocumentRecord["licenseStatus"];
  relevantSections: string[];
  topic?: string;
  tags: string[];
  incidentTypeIds: string[];
  priority: DocumentRecord["priority"];
  status: DocumentRecord["status"];
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  file?: { fileName: string; pageCount?: number };
  aiUsagePermission: boolean;
  /**
   * Computed at export time from lib/legislation/readiness.ts — the frontend
   * should use this (not `aiUsagePermission` alone) to decide whether a
   * record may be used for AI/RAG purposes.
   */
  aiEligible: boolean;
}

export function toPublishedLegislationExport(doc: DocumentRecord): PublishedLegislationExport {
  return {
    id: doc.id,
    title: doc.title,
    legislationName: doc.legislationName,
    sourceType: doc.sourceType,
    sourceCategory: doc.sourceCategory,
    authorityOrPublisher: doc.authorityOrPublisher,
    jurisdiction: doc.jurisdiction,
    language: doc.language,
    actNumber: doc.actNumber,
    documentVersionLabel: doc.documentVersionLabel,
    sourceUrl: doc.sourceUrl,
    effectiveDate: doc.effectiveDate,
    lastUpdatedDate: doc.lastUpdatedDate,
    nextReviewDate: doc.nextReviewDate,
    licenseStatus: doc.licenseStatus,
    relevantSections: doc.relevantSections,
    topic: doc.topic,
    tags: doc.tags,
    incidentTypeIds: doc.incidentTypeIds,
    priority: doc.priority,
    status: doc.status,
    isDemo: doc.isDemo,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    version: doc.version,
    file: doc.file ? { fileName: doc.file.fileName, pageCount: doc.file.pageCount } : undefined,
    aiUsagePermission: doc.aiUsagePermission,
    aiEligible: isAiEligible(doc),
  };
}
