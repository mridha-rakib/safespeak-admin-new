import type { AppSettings } from "@/lib/models/app-settings";
import type { AuditEvent } from "@/lib/models/audit-event";
import type { ContentBundleHistoryEntry } from "@/lib/models/content-bundle";
import type { DocumentChunk, DocumentRecord } from "@/lib/models/document";
import type { IncidentType } from "@/lib/models/incident-type";
import type { MatchingRule } from "@/lib/models/matching-rule";
import type { Microcard } from "@/lib/models/microcard";
import type { ReportingDestination } from "@/lib/models/reporting-destination";
import type { ResourceCategory } from "@/lib/models/resource-category";
import type { RightsContent } from "@/lib/models/rights-content";
import type { SupportOrganisation } from "@/lib/models/support-organisation";
import type { SupportProfessional } from "@/lib/models/support-professional";
import type { TriageLabel } from "@/lib/models/triage-label";

/** Generic CRUD boundary implemented once per content domain. */
export interface CrudRepository<T extends { id: string }> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  create(record: T): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
}

export interface DashboardSummary {
  publishedCount: number;
  draftCount: number;
  readyForReviewCount: number;
  needsUpdateCount: number;
  supportOrganisationCount: number;
  supportProfessionalCount: number;
  ragReadyDocumentCount: number;
  recentActivity: AuditEvent[];
  /** Always true in this phase — surfaced so the UI can label counts as demo data. */
  isDemoDataset: boolean;
}

/**
 * The persistence boundary the rest of the admin app talks to. Nothing
 * outside `lib/db` and `lib/repositories` should import Dexie directly —
 * page and component code goes through this interface (via the hooks in
 * `hooks/`) so a future API-backed implementation can be swapped in without
 * touching UI code.
 */
export interface AdminContentRepository {
  documents: CrudRepository<DocumentRecord> & {
    /**
     * PDF blobs are stored outside the Zod-validated `update()` path: Blob
     * values are not part of the persisted-data contract (they can't appear
     * in a JSON bundle export), so they're written directly rather than
     * passed through `documentSchema.parse()`, which would silently strip them.
     */
    setFileBlob(id: string, blob: Blob): Promise<void>;
    getFileBlob(id: string): Promise<Blob | undefined>;
  };
  documentChunks: {
    listForDocument(documentId: string): Promise<DocumentChunk[]>;
    replaceForDocument(documentId: string, chunks: DocumentChunk[]): Promise<void>;
  };
  microcards: CrudRepository<Microcard>;
  rightsContent: CrudRepository<RightsContent>;
  supportOrganisations: CrudRepository<SupportOrganisation>;
  supportProfessionals: CrudRepository<SupportProfessional>;
  reportingDestinations: CrudRepository<ReportingDestination>;
  incidentTypes: CrudRepository<IncidentType>;
  triageLabels: CrudRepository<TriageLabel>;
  resourceCategories: CrudRepository<ResourceCategory>;
  matchingRules: CrudRepository<MatchingRule>;
  auditEvents: {
    list(): Promise<AuditEvent[]>;
    append(event: AuditEvent): Promise<AuditEvent>;
  };
  settings: {
    get(): Promise<AppSettings>;
    update(patch: Partial<AppSettings>): Promise<AppSettings>;
  };
  bundleHistory: {
    list(): Promise<ContentBundleHistoryEntry[]>;
    append(entry: ContentBundleHistoryEntry): Promise<ContentBundleHistoryEntry>;
  };
  getDashboardSummary(): Promise<DashboardSummary>;
  /** Seeds demo data once. Safe to call on every app start — a no-op after the first run. */
  ensureSeeded(): Promise<void>;
  /** Wipes and re-seeds the local demo dataset deterministically. */
  resetDemoData(): Promise<void>;
}
