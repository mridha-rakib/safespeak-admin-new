import type { RagReadinessSummary } from "@/lib/legislation/readiness";
import type { UsageSummary } from "@/lib/taxonomy/dependency-service";
import type { TaxonomyEntity } from "@/lib/taxonomy/types";
import type { AppSettings } from "@/lib/models/app-settings";
import type { AuditAction, AuditEvent } from "@/lib/models/audit-event";
import type { ContentStatus } from "@/lib/models/base";
import type { ContentBundleHistoryEntry } from "@/lib/models/content-bundle";
import type { DocumentChunk, DocumentFileMeta, DocumentExtractionStatus, DocumentProcessingStatus, DocumentRecord } from "@/lib/models/document";
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

/**
 * Shared surface for Incident Types, Triage Labels, and Resource
 * Categories — one generic interface (kept fully typed per `T`) instead of
 * three near-duplicate ones, backed by one generic factory in
 * `indexeddb-admin-content-repository.ts`. See docs/ARCHITECTURE.md
 * "Shared taxonomy architecture."
 */
export interface TaxonomyRepository<T extends TaxonomyEntity> extends CrudRepository<T> {
  /** Throws StatusTransitionError when the status graph or the taxonomy publish guard rejects the move. */
  transitionStatus(id: string, nextStatus: ContentStatus, actor: string): Promise<T>;
  /** Throws VersionConflictError on a stale write, DuplicateMachineKeyError if the patch's key collides. */
  updateWithVersionCheck(id: string, patch: Partial<T>, expectedVersion: number, actor: string): Promise<T>;
  /** Throws InvalidDeletionError unless the record is an unreferenced draft. */
  deleteDraft(id: string, actor: string): Promise<void>;
  /** Persists a new display order for every id in `orderedIds`, transactionally. */
  reorder(orderedIds: string[], actor: string): Promise<T[]>;
  isMachineKeyTaken(machineKey: string, excludeId?: string): Promise<boolean>;
  isDisplayNameTaken(name: string, excludeId?: string): Promise<boolean>;
  /** Non-archived, valid records eligible as a Replace References target (excludes `excludeId`). */
  listActiveReplacementTargets(excludeId: string): Promise<T[]>;
  getUsage(id: string): Promise<UsageSummary>;
  /**
   * Repoints every reference from `sourceId` to `targetId` across every
   * domain that can reference this taxonomy kind, in one transaction; archives
   * the source afterward only when `archiveSourceAfter` is true and only
   * after the replacement itself succeeded. Throws InvalidReplacementTargetError
   * for a same-id, archived, or missing target.
   */
  replaceReferences(sourceId: string, targetId: string, actor: string, archiveSourceAfter: boolean): Promise<{ updatedRecordCount: number }>;
}

/**
 * Shared surface for Microcards and Rights & Legal Information — the
 * publishable-content counterpart to `TaxonomyRepository<T>`, minus the
 * machine-key/replace-references machinery those three taxonomy entities
 * need and these two don't. One generic factory backs both in
 * `indexeddb-admin-content-repository.ts`; see docs/ARCHITECTURE.md
 * "Shared educational-content architecture."
 */
export interface PublishableContentRepository<T extends { id: string }> extends CrudRepository<T> {
  /** Throws StatusTransitionError when the status graph or the content's own publish guard rejects the move. */
  transitionStatus(id: string, nextStatus: ContentStatus, actor: string): Promise<T>;
  /** Throws VersionConflictError on a stale write. */
  updateWithVersionCheck(id: string, patch: Partial<T>, expectedVersion: number, actor: string): Promise<T>;
  /** Throws InvalidDeletionError unless the record is an unreferenced draft. */
  deleteDraft(id: string, actor: string): Promise<void>;
  getUsage(id: string): Promise<UsageSummary>;
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
  /** Granular Microcards/Rights & Legal Information metrics, additional to (not replacing) the combined counts above. */
  publishedMicrocardCount: number;
  draftMicrocardCount: number;
  publishedRightsContentCount: number;
  rightsContentAwaitingReviewCount: number;
  /** "needs_update" status, across Microcards and Rights & Legal Information combined. */
  educationalContentNeedsUpdateCount: number;
  /** `reviewDueDate` in the past, across Microcards and Rights & Legal Information combined — regardless of status. */
  educationalContentReviewOverdueCount: number;
  /** Support Directory (Phase 5) metrics, additional to the combined counts above. */
  publishedOrganisationCount: number;
  organisationAwaitingReviewCount: number;
  verifiedOrganisationCount: number;
  publishedProfessionalCount: number;
  /** Published AND verificationStatus !== "verified" — never presented as an error, just a fact worth surfacing. */
  publishedUnverifiedProfessionalCount: number;
  professionalAwaitingReviewCount: number;
  publishedDestinationCount: number;
  destinationAwaitingReviewCount: number;
  /** "needs_update" status, across all three Support Directory domains combined. */
  supportDirectoryNeedsUpdateCount: number;
  /** `reviewDueDate`/`nextReviewDate` in the past, across all three Support Directory domains combined — regardless of status. */
  supportDirectoryReviewOverdueCount: number;
  /** Matching Rules (Phase 6) metrics, additional to the combined counts above. */
  publishedMatchingRuleCount: number;
  /** Published AND `enabled` — the matching engine will actually execute these. */
  enabledPublishedMatchingRuleCount: number;
  /** Published AND NOT `enabled` — kept in the bundle for inspection, but never executed. */
  disabledPublishedMatchingRuleCount: number;
  matchingRulesAwaitingReviewCount: number;
  matchingRulesNeedsUpdateCount: number;
  /** `reviewDueDate` in the past, regardless of status. */
  matchingRulesReviewOverdueCount: number;
  /** Published/ready-for-review/needs-update rules where `getMatchingRuleBlockers` currently returns at least one blocker. */
  matchingRulesWithBrokenRelationshipsCount: number;
}

export interface ExtractionResult {
  file: DocumentFileMeta;
  blob: Blob;
  chunks: DocumentChunk[];
  extractedTextPreview?: string;
  processingStatus: DocumentProcessingStatus;
  extractionStatus: DocumentExtractionStatus;
  processingIssue?: string;
}

export interface AuditContext {
  action: AuditAction;
  summary: string;
  actor: string;
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
    /**
     * Atomically applies a local-extraction outcome: document metadata +
     * blob + chunks + an audit event, in one Dexie transaction. Used for the
     * initial upload, a safe file replacement, and a retry — all three are
     * "commit this extraction result" with a different audit summary, never
     * three separate code paths. Only ever called after extraction has
     * already succeeded or definitively failed client-side; callers that are
     * replacing an existing valid file must not call this until the new
     * extraction has succeeded, so a failed replacement never destroys the
     * previous valid file/chunks.
     */
    applyExtractionResult(id: string, result: ExtractionResult, audit: AuditContext): Promise<DocumentRecord>;
    /** Validates the status graph + legislation publish guard, updates status, and appends an audit event atomically. Throws StatusTransitionError when not allowed. */
    transitionStatus(id: string, nextStatus: ContentStatus, actor: string): Promise<DocumentRecord>;
    /** Throws VersionConflictError if `expectedVersion` no longer matches the stored version (another tab/session updated it first). */
    updateWithVersionCheck(
      id: string,
      patch: Partial<DocumentRecord>,
      expectedVersion: number,
      actor: string
    ): Promise<DocumentRecord>;
    /** Throws InvalidDeletionError unless the record's status is "draft". Removes the document, its chunks, and its stored blob together. */
    deleteDraft(id: string, actor: string): Promise<void>;
    listOverdueForReview(): Promise<DocumentRecord[]>;
  };
  documentChunks: {
    listForDocument(documentId: string): Promise<DocumentChunk[]>;
    replaceForDocument(documentId: string, chunks: DocumentChunk[]): Promise<void>;
  };
  getRagReadinessSummary(): Promise<RagReadinessSummary>;
  microcards: PublishableContentRepository<Microcard> & {
    /** Persists a new display order for every id in `orderedIds`, transactionally. Rights & Legal Information has no display-order requirement, so this stays microcards-only. */
    reorder(orderedIds: string[], actor: string): Promise<Microcard[]>;
  };
  rightsContent: PublishableContentRepository<RightsContent>;
  supportOrganisations: PublishableContentRepository<SupportOrganisation>;
  supportProfessionals: PublishableContentRepository<SupportProfessional> & {
    /**
     * Profile-image Blob storage, mirroring `documents.setFileBlob`/
     * `getFileBlob` — outside the Zod-validated `create`/`update` path
     * since `Blob` isn't part of the persisted-data contract used for JSON
     * bundle export. `setProfileImage` writes the Blob, the file metadata
     * (`profilePhoto`), and an audit event in one transaction; a failed
     * replacement (validation happens before this is ever called) can
     * therefore never destroy a previously-stored valid image.
     */
    setProfileImage(id: string, blob: Blob, meta: SupportProfessional["profilePhoto"], actor: string): Promise<void>;
    getProfileImage(id: string): Promise<Blob | undefined>;
    /** Removes the stored image Blob and clears `profilePhoto`, plus an audit event, in one transaction. */
    removeProfileImage(id: string, actor: string): Promise<void>;
  };
  reportingDestinations: PublishableContentRepository<ReportingDestination>;
  incidentTypes: TaxonomyRepository<IncidentType>;
  triageLabels: TaxonomyRepository<TriageLabel>;
  resourceCategories: TaxonomyRepository<ResourceCategory>;
  matchingRules: PublishableContentRepository<MatchingRule>;
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
