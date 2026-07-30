import { createBaseFields } from "../../../src/lib/models/base";
import type { DocumentRecord } from "../../../src/lib/models/document";

/**
 * Produces a document that satisfies every publish/AI-eligibility blocker by
 * default (file present, extraction succeeded, metadata complete, legal
 * review complete, AI permitted, published). Tests override just the field
 * under test rather than repeating this whole shape everywhere.
 */
export function makeTestDocument(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    ...createBaseFields({ status: "published" }),
    title: "Test Act — Summary",
    sourceType: "legislation",
    sourceCategory: "Federal legislation",
    authorityOrPublisher: "Test Authority",
    jurisdiction: "commonwealth",
    language: "en",
    licenseStatus: "government_open_license",
    relevantSections: [],
    tags: [],
    incidentTypeIds: [],
    priority: "medium",
    aiUsagePermission: true,
    legalReviewComplete: true,
    processingStatus: "ready_for_ai_processing",
    extractionStatus: "extracted",
    localPreviewStatus: "available",
    file: { fileName: "test-act.pdf", fileSizeBytes: 1024, fileType: "application/pdf", pageCount: 3 },
    nextReviewDate: "2027-01-01",
    ...overrides,
  };
}
