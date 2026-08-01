import Dexie, { type EntityTable } from "dexie";

import type { AdminAccount } from "@/lib/models/admin-account";
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
import { suggestMachineKeyFromName } from "@/lib/taxonomy/machine-key";

/**
 * Bump this and add a new `.version(n).stores({...})` block (with an
 * `.upgrade()` callback if data needs transforming) whenever the schema
 * changes. Never edit an existing `.version()` block in place — see
 * README "Dexie schema" for the migration policy.
 */
export const DB_SCHEMA_VERSION = 3;

/**
 * Shape of a `matchingRules` row as it could have been stored under schema
 * version 1, before Phase 6 introduced `machineKey`/`enabled`/`topicKeys`/
 * plural `incidentTypeIds`/etc. Only used by the version(2) `.upgrade()`
 * below — never imported elsewhere.
 */
interface LegacyMatchingRuleRow {
  id: string;
  name: string;
  incidentTypeId?: string;
  active?: boolean;
  required?: boolean;
  machineKey?: string;
  [key: string]: unknown;
}

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
  adminAccount!: EntityTable<AdminAccount, "id">;

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
      reportingDestinations: "id, status, createdAt, updatedAt",
      incidentTypes: "id, name, createdAt",
      triageLabels: "id, urgencyLevel, createdAt",
      resourceCategories: "id, parentCategoryId, createdAt",
      matchingRules: "id, incidentTypeId, createdAt",
      auditEvents: "id, entityType, entityId, action, timestamp",
      appSettings: "id",
      contentBundleHistory: "id, generatedAt",
    });

    // Phase 6: Matching Rules gained machineKey/enabled/topicKeys/plural
    // incidentTypeIds and several new fields — see lib/models/matching-rule.ts.
    // Only `matchingRules` changes here; every other store keeps its
    // version(1) definition (Dexie merges unspecified stores forward).
    this.version(2)
      .stores({
        matchingRules: "id, status, machineKey, createdAt, updatedAt",
      })
      .upgrade(async (tx) => {
        const rows = (await tx.table("matchingRules").toArray()) as LegacyMatchingRuleRow[];
        for (const row of rows) {
          const machineKey =
            typeof row.machineKey === "string" && row.machineKey.length > 0
              ? row.machineKey
              : suggestMachineKeyFromName(row.name || row.id) || `matching_rule_${row.id.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`;
          const incidentTypeIds = Array.isArray(row.incidentTypeIds)
            ? row.incidentTypeIds
            : row.incidentTypeId
              ? [row.incidentTypeId]
              : [];

          await tx.table("matchingRules").put({
            id: row.id,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            createdBy: row.createdBy,
            updatedBy: row.updatedBy,
            isDemo: row.isDemo,
            status: row.status,
            version: row.version,
            name: row.name,
            machineKey,
            description: row.description,
            priority: typeof row.priority === "number" ? row.priority : 0,
            enabled: typeof row.enabled === "boolean" ? row.enabled : (row.active ?? true),
            topicKeys: Array.isArray(row.topicKeys) ? row.topicKeys : [],
            incidentTypeIds,
            triageLabelIds: Array.isArray(row.triageLabelIds) ? row.triageLabelIds : [],
            resourceCategoryIds: Array.isArray(row.resourceCategoryIds) ? row.resourceCategoryIds : [],
            // v1 jurisdictions were untyped free strings (e.g. "Demo Jurisdiction");
            // the new field is a typed AustralianJurisdiction enum with no safe
            // mapping from the old free text, so it resets to the "no filter"
            // wildcard rather than guessing — see matching-rule.ts's own doc comment.
            jurisdictions: [],
            urgencyLevels: Array.isArray(row.urgencyLevels) ? row.urgencyLevels : [],
            supportNeeds: Array.isArray(row.supportNeeds) ? row.supportNeeds : [],
            legislationIds: Array.isArray(row.legislationIds) ? row.legislationIds : [],
            microcardIds: Array.isArray(row.microcardIds) ? row.microcardIds : [],
            rightsContentIds: Array.isArray(row.rightsContentIds) ? row.rightsContentIds : [],
            supportOrganisationIds: Array.isArray(row.supportOrganisationIds) ? row.supportOrganisationIds : [],
            supportProfessionalIds: Array.isArray(row.supportProfessionalIds) ? row.supportProfessionalIds : [],
            reportingDestinationIds: Array.isArray(row.reportingDestinationIds) ? row.reportingDestinationIds : [],
            reviewDueDate: row.reviewDueDate,
            internalNotes: row.internalNotes,
            publishedDate: row.publishedDate,
          });
        }
      });

    // Phase 8.4: the logged-in Admin's own self-profile (display name only —
    // see lib/models/admin-account.ts). A brand-new singleton store, so no
    // .upgrade() is needed; every other store keeps its prior definition.
    this.version(3).stores({
      adminAccount: "id",
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
