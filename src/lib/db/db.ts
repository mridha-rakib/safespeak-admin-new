import Dexie, { type EntityTable } from "dexie";

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

/**
 * Bump this and add a new `.version(n).stores({...})` block (with an
 * `.upgrade()` callback if data needs transforming) whenever the schema
 * changes. Never edit an existing `.version()` block in place — see
 * README "Dexie schema" for the migration policy.
 */
export const DB_SCHEMA_VERSION = 1;

export class AdminDatabase extends Dexie {
  documents!: EntityTable<DocumentRecord, "id">;
  documentChunks!: EntityTable<DocumentChunk, "id">;
  microcards!: EntityTable<Microcard, "id">;
  rightsContent!: EntityTable<RightsContent, "id">;
  supportOrganisations!: EntityTable<SupportOrganisation, "id">;
  supportProfessionals!: EntityTable<SupportProfessional, "id">;
  reportingDestinations!: EntityTable<ReportingDestination, "id">;
  incidentTypes!: EntityTable<IncidentType, "id">;
  triageLabels!: EntityTable<TriageLabel, "id">;
  resourceCategories!: EntityTable<ResourceCategory, "id">;
  matchingRules!: EntityTable<MatchingRule, "id">;
  auditEvents!: EntityTable<AuditEvent, "id">;
  appSettings!: EntityTable<AppSettings, "id">;
  contentBundleHistory!: EntityTable<ContentBundleHistoryEntry, "id">;

  constructor(name = "safespeak-admin") {
    super(name);

    // Note: boolean fields (isDemo, verified, active, ...) are deliberately
    // NOT indexed here — boolean is not a valid IndexedDB key type. Those
    // fields are filtered in JS after `.toArray()` instead.
    this.version(DB_SCHEMA_VERSION).stores({
      documents: "id, status, sourceType, processingStatus, createdAt, updatedAt",
      documentChunks: "id, documentId, chunkIndex, createdAt",
      microcards: "id, status, topic, createdAt, updatedAt",
      rightsContent: "id, status, jurisdiction, createdAt, updatedAt",
      supportOrganisations: "id, status, createdAt, updatedAt",
      supportProfessionals: "id, status, professionalType, verificationStatus, createdAt, updatedAt",
      reportingDestinations: "id, status, jurisdiction, createdAt, updatedAt",
      incidentTypes: "id, name, createdAt",
      triageLabels: "id, urgencyLevel, createdAt",
      resourceCategories: "id, parentCategoryId, createdAt",
      matchingRules: "id, incidentTypeId, createdAt",
      auditEvents: "id, entityType, entityId, action, timestamp",
      appSettings: "id",
      contentBundleHistory: "id, generatedAt",
    });
  }
}

let dbInstance: AdminDatabase | null = null;

/** Lazily-created singleton so the Dexie connection is only opened in the browser. */
export function getDb(): AdminDatabase {
  if (typeof window === "undefined") {
    throw new Error("AdminDatabase can only be accessed in the browser.");
  }
  if (!dbInstance) {
    dbInstance = new AdminDatabase();
  }
  return dbInstance;
}

/** Test-only escape hatch: point the singleton at a fresh, isolated database. */
export function __setDbInstanceForTests(db: AdminDatabase | null): void {
  dbInstance = db;
}
