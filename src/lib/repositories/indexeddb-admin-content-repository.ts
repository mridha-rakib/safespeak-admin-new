import type { EntityTable } from "dexie";
import type { ZodType } from "zod";

import { DB_SCHEMA_VERSION, getDb } from "@/lib/db/db";
import { buildSeedAuditEvents, seedDocuments, seedIncidentTypes, seedMatchingRules, seedMicrocards, seedReportingDestinations, seedResourceCategories, seedRightsContent, seedSupportOrganisations, seedSupportProfessionals, seedTriageLabels } from "@/lib/db/seed";
import { filterValidRecords } from "@/lib/db/validation";
import { APP_SETTINGS_ID, appSettingsSchema, type AppSettings } from "@/lib/models/app-settings";
import { auditEventSchema, createAuditEvent, type AuditEvent } from "@/lib/models/audit-event";
import { LOCAL_ADMIN_ACTOR, nowIso } from "@/lib/models/base";
import { BUNDLE_SCHEMA_VERSION, contentBundleHistorySchema, type ContentBundleHistoryEntry } from "@/lib/models/content-bundle";
import { documentChunkSchema, documentSchema, type DocumentChunk, type DocumentRecord } from "@/lib/models/document";
import { incidentTypeSchema, type IncidentType } from "@/lib/models/incident-type";
import { matchingRuleSchema, type MatchingRule } from "@/lib/models/matching-rule";
import { microcardSchema, type Microcard } from "@/lib/models/microcard";
import { reportingDestinationSchema, type ReportingDestination } from "@/lib/models/reporting-destination";
import { resourceCategorySchema, type ResourceCategory } from "@/lib/models/resource-category";
import { rightsContentSchema, type RightsContent } from "@/lib/models/rights-content";
import { supportOrganisationSchema, type SupportOrganisation } from "@/lib/models/support-organisation";
import { supportProfessionalSchema, type SupportProfessional } from "@/lib/models/support-professional";
import { triageLabelSchema, type TriageLabel } from "@/lib/models/triage-label";
import type {
  AdminContentRepository,
  CrudRepository,
  DashboardSummary,
} from "@/lib/repositories/admin-content-repository";

function createCrudRepository<T extends { id: string; updatedAt?: string; version?: number }>(
  table: EntityTable<T, "id">,
  schema: ZodType<T>,
  context: string
): CrudRepository<T> {
  return {
    async list() {
      const rows = await table.toArray();
      const { records } = filterValidRecords(schema, rows, context);
      return records;
    },
    async get(id) {
      // Dexie's generic PrimaryKeyType inference can't resolve a concrete key
      // type for a generic T, so the id (already narrowed to `string` by
      // CrudRepository<T>) is cast at this one boundary rather than widening
      // the public interface.
      const row = await table.get(id as never);
      if (!row) return undefined;
      const parsed = schema.safeParse(row);
      return parsed.success ? parsed.data : undefined;
    },
    async create(record) {
      const validated = schema.parse(record);
      await table.put(validated);
      return validated;
    },
    async update(id, patch) {
      const existing = await table.get(id as never);
      if (!existing) {
        throw new Error(`${context} record "${id}" was not found.`);
      }
      const merged = {
        ...existing,
        ...patch,
        updatedAt: nowIso(),
        version: (existing.version ?? 1) + 1,
      };
      const validated = schema.parse(merged);
      await table.put(validated);
      return validated;
    },
    async remove(id) {
      await table.delete(id as never);
    },
  };
}

async function clearDemoRows<T extends { id: string; isDemo?: boolean }>(
  table: EntityTable<T, "id">
): Promise<void> {
  const rows = await table.toArray();
  const demoIds = rows.filter((row) => row.isDemo).map((row) => row.id);
  if (demoIds.length > 0) {
    await table.bulkDelete(demoIds as never[]);
  }
}

export function createIndexedDbAdminContentRepository(): AdminContentRepository {
  const db = getDb();

  const documentsCrud = createCrudRepository<DocumentRecord>(db.documents, documentSchema, "document");
  const documents = {
    ...documentsCrud,
    async setFileBlob(id: string, blob: Blob): Promise<void> {
      await db.documents.update(id, { fileBlob: blob } as Partial<DocumentRecord>);
    },
    async getFileBlob(id: string): Promise<Blob | undefined> {
      const row = await db.documents.get(id);
      return row?.fileBlob;
    },
  };
  const microcards = createCrudRepository<Microcard>(db.microcards, microcardSchema, "microcard");
  const rightsContent = createCrudRepository<RightsContent>(db.rightsContent, rightsContentSchema, "rights content");
  const supportOrganisations = createCrudRepository<SupportOrganisation>(
    db.supportOrganisations,
    supportOrganisationSchema,
    "support organisation"
  );
  const supportProfessionals = createCrudRepository<SupportProfessional>(
    db.supportProfessionals,
    supportProfessionalSchema,
    "support professional"
  );
  const reportingDestinations = createCrudRepository<ReportingDestination>(
    db.reportingDestinations,
    reportingDestinationSchema,
    "reporting destination"
  );
  const incidentTypes = createCrudRepository<IncidentType>(db.incidentTypes, incidentTypeSchema, "incident type");
  const triageLabels = createCrudRepository<TriageLabel>(db.triageLabels, triageLabelSchema, "triage label");
  const resourceCategories = createCrudRepository<ResourceCategory>(
    db.resourceCategories,
    resourceCategorySchema,
    "resource category"
  );
  const matchingRules = createCrudRepository<MatchingRule>(db.matchingRules, matchingRuleSchema, "matching rule");

  const auditEvents = {
    async list(): Promise<AuditEvent[]> {
      const rows = await db.auditEvents.orderBy("timestamp").reverse().toArray();
      const { records } = filterValidRecords(auditEventSchema, rows, "audit event");
      return records;
    },
    async append(event: AuditEvent): Promise<AuditEvent> {
      const validated = auditEventSchema.parse(event);
      await db.auditEvents.put(validated);
      return validated;
    },
  };

  const settings = {
    async get(): Promise<AppSettings> {
      const row = await db.appSettings.get(APP_SETTINGS_ID);
      if (row) {
        const parsed = appSettingsSchema.safeParse(row);
        if (parsed.success) return parsed.data;
      }
      const defaults = appSettingsSchema.parse({
        id: APP_SETTINGS_ID,
        dbSchemaVersion: DB_SCHEMA_VERSION,
        bundleSchemaVersion: BUNDLE_SCHEMA_VERSION,
        updatedAt: nowIso(),
      });
      await db.appSettings.put(defaults);
      return defaults;
    },
    async update(patch: Partial<AppSettings>): Promise<AppSettings> {
      const current = await settings.get();
      const merged = appSettingsSchema.parse({ ...current, ...patch, updatedAt: nowIso() });
      await db.appSettings.put(merged);
      return merged;
    },
  };

  const bundleHistory = {
    async list(): Promise<ContentBundleHistoryEntry[]> {
      const rows = await db.contentBundleHistory.orderBy("generatedAt").reverse().toArray();
      const { records } = filterValidRecords(contentBundleHistorySchema, rows, "bundle history entry");
      return records;
    },
    async append(entry: ContentBundleHistoryEntry): Promise<ContentBundleHistoryEntry> {
      const validated = contentBundleHistorySchema.parse(entry);
      await db.contentBundleHistory.put(validated);
      return validated;
    },
  };

  async function getDashboardSummary(): Promise<DashboardSummary> {
    const [docs, cards, rights, orgs, professionals, recentActivity] = await Promise.all([
      documents.list(),
      microcards.list(),
      rightsContent.list(),
      supportOrganisations.list(),
      supportProfessionals.list(),
      db.auditEvents.orderBy("timestamp").reverse().limit(8).toArray(),
    ]);

    const publishable = [...docs, ...cards, ...rights];
    const publishedCount = publishable.filter((r) => r.status === "published").length;
    const draftCount = publishable.filter((r) => r.status === "draft").length;
    const readyForReviewCount = publishable.filter((r) => r.status === "ready_for_review").length;
    const needsUpdateCount = publishable.filter((r) => r.status === "needs_update").length;
    const ragReadyDocumentCount = docs.filter((d) => d.processingStatus === "ready_for_ai_processing").length;

    return {
      publishedCount,
      draftCount,
      readyForReviewCount,
      needsUpdateCount,
      supportOrganisationCount: orgs.length,
      supportProfessionalCount: professionals.length,
      ragReadyDocumentCount,
      recentActivity: filterValidRecords(auditEventSchema, recentActivity, "audit event").records,
      isDemoDataset: true,
    };
  }

  async function seedAllDemoData(): Promise<void> {
    await db.transaction(
      "rw",
      [
        db.incidentTypes,
        db.triageLabels,
        db.resourceCategories,
        db.documents,
        db.microcards,
        db.rightsContent,
        db.supportOrganisations,
        db.supportProfessionals,
        db.reportingDestinations,
        db.matchingRules,
        db.auditEvents,
      ],
      async () => {
        await db.incidentTypes.bulkPut(seedIncidentTypes);
        await db.triageLabels.bulkPut(seedTriageLabels);
        await db.resourceCategories.bulkPut(seedResourceCategories);
        await db.documents.bulkPut(seedDocuments);
        await db.microcards.bulkPut(seedMicrocards);
        await db.rightsContent.bulkPut(seedRightsContent);
        await db.supportOrganisations.bulkPut(seedSupportOrganisations);
        await db.supportProfessionals.bulkPut(seedSupportProfessionals);
        await db.reportingDestinations.bulkPut(seedReportingDestinations);
        await db.matchingRules.bulkPut(seedMatchingRules);
        await db.auditEvents.bulkPut(buildSeedAuditEvents(nowIso()));
      }
    );
  }

  return {
    documents,
    documentChunks: {
      async listForDocument(documentId: string): Promise<DocumentChunk[]> {
        const rows = await db.documentChunks.where("documentId").equals(documentId).sortBy("chunkIndex");
        const { records } = filterValidRecords(documentChunkSchema, rows, "document chunk");
        return records;
      },
      async replaceForDocument(documentId: string, chunks: DocumentChunk[]): Promise<void> {
        await db.transaction("rw", db.documentChunks, async () => {
          const existingIds = await db.documentChunks.where("documentId").equals(documentId).primaryKeys();
          await db.documentChunks.bulkDelete(existingIds);
          await db.documentChunks.bulkPut(chunks.map((chunk) => documentChunkSchema.parse(chunk)));
        });
      },
    },
    microcards,
    rightsContent,
    supportOrganisations,
    supportProfessionals,
    reportingDestinations,
    incidentTypes,
    triageLabels,
    resourceCategories,
    matchingRules,
    auditEvents,
    settings,
    bundleHistory,
    getDashboardSummary,

    async ensureSeeded(): Promise<void> {
      const current = await settings.get();
      if (current.demoDataSeededAt) return;

      await seedAllDemoData();
      await settings.update({ demoDataSeededAt: nowIso() });
    },

    async resetDemoData(): Promise<void> {
      await db.transaction(
        "rw",
        [
          db.incidentTypes,
          db.triageLabels,
          db.resourceCategories,
          db.documents,
          db.documentChunks,
          db.microcards,
          db.rightsContent,
          db.supportOrganisations,
          db.supportProfessionals,
          db.reportingDestinations,
          db.matchingRules,
          db.auditEvents,
        ],
        async () => {
          await clearDemoRows(db.incidentTypes);
          await clearDemoRows(db.triageLabels);
          await clearDemoRows(db.resourceCategories);
          const demoDocs = (await db.documents.toArray()).filter((d) => d.isDemo);
          for (const doc of demoDocs) {
            const chunkIds = await db.documentChunks.where("documentId").equals(doc.id).primaryKeys();
            await db.documentChunks.bulkDelete(chunkIds);
          }
          await clearDemoRows(db.documents);
          await clearDemoRows(db.microcards);
          await clearDemoRows(db.rightsContent);
          await clearDemoRows(db.supportOrganisations);
          await clearDemoRows(db.supportProfessionals);
          await clearDemoRows(db.reportingDestinations);
          await clearDemoRows(db.matchingRules);
          await clearDemoRows(db.auditEvents);
        }
      );

      await seedAllDemoData();
      const resetAt = nowIso();
      await settings.update({ demoDataSeededAt: resetAt, demoDataLastResetAt: resetAt });
      await auditEvents.append(
        createAuditEvent({
          entityType: "app_settings",
          entityId: APP_SETTINGS_ID,
          action: "demo_data_reset",
          actor: LOCAL_ADMIN_ACTOR,
          summary: "Local demo dataset was reset to its deterministic starting state.",
          isDemo: true,
        })
      );
    },
  };
}
