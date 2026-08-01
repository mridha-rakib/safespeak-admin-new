import type { AdminDatabase } from "@/lib/db/db";
import type { EntityTable } from "dexie";
import type { ZodType } from "zod";

import { DB_SCHEMA_VERSION, getDb } from "@/lib/db/db";
import { buildSeedAuditEvents, seedDocumentChunks, seedDocuments, seedIncidentTypes, seedMatchingRules, seedMicrocards, seedReportingDestinations, seedResourceCategories, seedRightsContent, seedSupportOrganisations, seedSupportProfessionals, seedTriageLabels } from "@/lib/db/seed";
import { filterValidRecords } from "@/lib/db/validation";
import { isReviewOverdue, summarizeReadiness, type RagReadinessSummary } from "@/lib/legislation/readiness";
import { isReviewDueOverdue } from "@/lib/content/review-due";
import { getIncidentTypeBlockers, getResourceCategoryBlockers, getTriageLabelBlockers } from "@/lib/taxonomy/eligibility";
import {
  computeTaxonomyUsage,
  planReferenceReplacement,
  type DependencyKind,
  type ReferenceReplacementPlan,
  type TaxonomyDataBundle,
  type TaxonomyKind,
} from "@/lib/taxonomy/dependency-service";
import { getMicrocardBlockers } from "@/lib/microcards/eligibility";
import { getMatchingRuleBlockers } from "@/lib/matching-rules/eligibility";
import { getRightsContentBlockers } from "@/lib/rights-content/eligibility";
import { getSupportOrganisationBlockers } from "@/lib/support-directory/support-organisation-eligibility";
import { getProfessionalBlockers } from "@/lib/support-directory/professional-eligibility";
import { getDestinationBlockers } from "@/lib/support-directory/destination-eligibility";
import { isDuplicateDisplayName, isDuplicateMachineKey } from "@/lib/taxonomy/validation";
import type { TaxonomyEntity } from "@/lib/taxonomy/types";
import { ADMIN_ACCOUNT_ID, adminAccountSchema, type AdminAccount } from "@/lib/models/admin-account";
import { APP_SETTINGS_ID, appSettingsSchema, type AppSettings } from "@/lib/models/app-settings";
import { auditEventSchema, createAuditEvent, type AuditEntityType, type AuditEvent } from "@/lib/models/audit-event";
import { LOCAL_ADMIN_ACTOR, nowIso, type ContentStatus } from "@/lib/models/base";
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
import { canTransitionStatus, legislationPublishGuard, taxonomyPublishGuard } from "@/lib/publishing/workflow";
import type {
  AdminContentRepository,
  AuditContext,
  CrudRepository,
  DashboardSummary,
  ExtractionResult,
  PublishableContentRepository,
  TaxonomyRepository,
} from "@/lib/repositories/admin-content-repository";
import {
  DuplicateMachineKeyError,
  InvalidDeletionError,
  InvalidReplacementTargetError,
  StatusTransitionError,
  VersionConflictError,
} from "@/lib/repositories/errors";

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

/**
 * Writes one planned reference replacement (see lib/taxonomy/dependency-service.ts
 * `planReferenceReplacement`) to the correct Dexie table and field. This is
 * the one place that knows the physical table+field for each
 * (entityType, taxonomyKind) pair — the dependency service deliberately
 * stays Dexie-free so it can be unit tested without a browser.
 */
async function applyReferenceReplacementPlan(
  db: AdminDatabase,
  kind: TaxonomyKind,
  plan: ReferenceReplacementPlan,
  actor: string
): Promise<void> {
  const bump = { updatedAt: nowIso(), updatedBy: actor };

  async function bumpVersion<R extends { id: string; version: number }>(table: EntityTable<R, "id">, id: string, changes: Partial<R>) {
    const existing = await table.get(id as never);
    if (!existing) return;
    await table.update(id as never, { ...changes, ...bump, version: (existing.version ?? 1) + 1 } as never);
  }

  switch (plan.entityType) {
    case "document":
      // Documents are only ever a reference source for "incident_type" — no resourceCategoryIds/triageLabelIds field exists on DocumentRecord.
      await bumpVersion(db.documents, plan.recordId, { incidentTypeIds: plan.updatedIds } as never);
      break;
    case "microcard":
      // A microcard can be a source for "incident_type" (array) or "resource_category" (singular `resourceCategoryId`) — never both in the same plan entry, but the two kinds write to different fields.
      if (kind === "incident_type") {
        await bumpVersion(db.microcards, plan.recordId, { incidentTypeIds: plan.updatedIds } as never);
      } else if (kind === "resource_category") {
        await bumpVersion(db.microcards, plan.recordId, { resourceCategoryId: plan.updatedIds[0] } as never);
      }
      break;
    case "rights_content":
      if (kind === "incident_type") {
        await bumpVersion(db.rightsContent, plan.recordId, { incidentTypeIds: plan.updatedIds } as never);
      } else if (kind === "resource_category") {
        await bumpVersion(db.rightsContent, plan.recordId, { resourceCategoryIds: plan.updatedIds } as never);
      }
      break;
    case "support_organisation":
      if (kind === "incident_type") {
        await bumpVersion(db.supportOrganisations, plan.recordId, { incidentTypeIds: plan.updatedIds } as never);
      } else if (kind === "resource_category") {
        await bumpVersion(db.supportOrganisations, plan.recordId, { resourceCategoryIds: plan.updatedIds } as never);
      }
      break;
    case "support_professional":
      if (kind === "incident_type") {
        await bumpVersion(db.supportProfessionals, plan.recordId, { incidentTypeIds: plan.updatedIds } as never);
      } else if (kind === "triage_label") {
        await bumpVersion(db.supportProfessionals, plan.recordId, { triageLabelIds: plan.updatedIds } as never);
      } else if (kind === "resource_category") {
        await bumpVersion(db.supportProfessionals, plan.recordId, { resourceCategoryIds: plan.updatedIds } as never);
      }
      break;
    case "reporting_destination":
      if (kind === "incident_type") {
        await bumpVersion(db.reportingDestinations, plan.recordId, { incidentTypeIds: plan.updatedIds } as never);
      } else if (kind === "resource_category") {
        await bumpVersion(db.reportingDestinations, plan.recordId, { resourceCategoryIds: plan.updatedIds } as never);
      }
      break;
    case "matching_rule":
      if (kind === "incident_type") {
        await bumpVersion(db.matchingRules, plan.recordId, { incidentTypeIds: plan.updatedIds } as never);
      } else if (kind === "triage_label") {
        await bumpVersion(db.matchingRules, plan.recordId, { triageLabelIds: plan.updatedIds } as never);
      }
      break;
    case "incident_type":
      if (kind === "resource_category") {
        await bumpVersion(db.incidentTypes, plan.recordId, { relatedResourceCategoryIds: plan.updatedIds } as never);
      }
      break;
    default:
      break;
  }
}

interface TaxonomyRecordShape extends TaxonomyEntity {
  isDemo: boolean;
  createdBy: string;
  updatedBy: string;
  version: number;
}

/**
 * One generic factory backing Incident Types, Triage Labels, and Resource
 * Categories — see docs/ARCHITECTURE.md "Shared taxonomy architecture."
 * `getBlockers`/`buildDataBundle` are injected per entity so the factory
 * itself never special-cases a specific taxonomy kind.
 */
function createTaxonomyRepository<T extends TaxonomyRecordShape>(
  db: AdminDatabase,
  table: EntityTable<T, "id">,
  schema: ZodType<T>,
  context: string,
  kind: TaxonomyKind,
  auditEntityType: AuditEntityType,
  getBlockers: (record: T, existing: T[]) => string[],
  buildDataBundle: () => Promise<TaxonomyDataBundle>
): TaxonomyRepository<T> {
  const crud = createCrudRepository<T>(table, schema, context);

  return {
    ...crud,

    async create(record) {
      const existing = await table.toArray();
      if (isDuplicateMachineKey(record.machineKey, existing)) {
        throw new DuplicateMachineKeyError(`The stable key "${record.machineKey}" is already used by another ${context} record.`);
      }
      return db.transaction("rw", [table, db.auditEvents], async () => {
        const validated = schema.parse(record);
        await table.put(validated);
        await db.auditEvents.put(
          auditEventSchema.parse(
            createAuditEvent({
              entityType: auditEntityType,
              entityId: validated.id,
              action: "created",
              actor: validated.createdBy,
              nextStatus: validated.status,
              summary: `Created "${validated.name}" (stable key: ${validated.machineKey}).`,
              isDemo: validated.isDemo,
            })
          )
        );
        return validated;
      });
    },

    async updateWithVersionCheck(id, patch, expectedVersion, actor) {
      return db.transaction("rw", [table], async () => {
        const existing = await table.get(id as never);
        if (!existing) throw new Error(`${context} "${id}" was not found.`);
        if ((existing.version ?? 1) !== expectedVersion) {
          throw new VersionConflictError(
            `This ${context} record was updated elsewhere since you started editing. Reload to see the latest version before saving again.`
          );
        }

        // The stable key is immutable after creation — a patch can never change it,
        // no matter what the caller sends.
        const safePatch: Partial<T> = { ...patch };
        delete (safePatch as Record<string, unknown>).machineKey;

        const merged = schema.parse({
          ...existing,
          ...safePatch,
          updatedAt: nowIso(),
          updatedBy: actor,
          version: existing.version + 1,
        });
        await table.put(merged);
        return merged;
      });
    },

    async transitionStatus(id, nextStatus, actor) {
      return db.transaction("rw", [table, db.auditEvents], async () => {
        const existing = await table.get(id as never);
        if (!existing) throw new Error(`${context} "${id}" was not found.`);

        const others = (await table.toArray()).filter((r) => r.id !== id);
        const blockers = getBlockers(existing, others);
        const guard = taxonomyPublishGuard(blockers);
        const decision = canTransitionStatus(existing.status, nextStatus, guard);
        if (!decision.allowed) {
          throw new StatusTransitionError(decision.reason ?? "This status change is not allowed.");
        }

        const merged = schema.parse({
          ...existing,
          status: nextStatus,
          updatedAt: nowIso(),
          updatedBy: actor,
          version: existing.version + 1,
        });
        await table.put(merged);
        await db.auditEvents.put(
          auditEventSchema.parse(
            createAuditEvent({
              entityType: auditEntityType,
              entityId: id,
              action: "status_changed",
              actor,
              previousStatus: existing.status,
              nextStatus,
              summary: `"${merged.name}" moved from ${existing.status.replace(/_/g, " ")} to ${nextStatus.replace(/_/g, " ")}.`,
              isDemo: merged.isDemo,
            })
          )
        );
        return merged;
      });
    },

    async deleteDraft(id, actor) {
      // buildDataBundle() reads across every referencing domain's Dexie
      // table (documents, microcards, ...), so it must run before the
      // transaction starts — a Dexie transaction can only touch the tables
      // explicitly listed in its scope, and this one is scoped narrowly to
      // [table, auditEvents] for the actual delete + audit write.
      const bundle = await buildDataBundle();

      await db.transaction("rw", [table, db.auditEvents], async () => {
        const existing = await table.get(id as never);
        if (!existing) return;
        if (existing.status !== "draft") {
          throw new InvalidDeletionError(`Only draft ${context} records can be permanently deleted. Use Archive for published or in-review content.`);
        }

        const usage = computeTaxonomyUsage(kind, id, bundle);
        if (usage.totalCount > 0) {
          throw new InvalidDeletionError(
            `This ${context} record is used by ${usage.totalCount} other record(s) and cannot be deleted. Use Replace references first.`
          );
        }

        await table.delete(id as never);
        await db.auditEvents.put(
          auditEventSchema.parse(
            createAuditEvent({
              entityType: auditEntityType,
              entityId: id,
              action: "deleted",
              actor,
              summary: `Deleted local draft "${existing.name}".`,
              isDemo: existing.isDemo,
            })
          )
        );
      });
    },

    async reorder(orderedIds, actor) {
      return db.transaction("rw", [table, db.auditEvents], async () => {
        const all = await table.toArray();
        const byId = new Map(all.map((r) => [r.id, r]));
        const updated: T[] = [];

        for (let index = 0; index < orderedIds.length; index += 1) {
          const record = byId.get(orderedIds[index]!);
          if (!record || record.displayOrder === index) continue;
          const merged = schema.parse({
            ...record,
            displayOrder: index,
            updatedAt: nowIso(),
            updatedBy: actor,
            version: record.version + 1,
          });
          await table.put(merged);
          updated.push(merged);
        }

        if (updated.length > 0) {
          await db.auditEvents.put(
            auditEventSchema.parse(
              createAuditEvent({
                entityType: auditEntityType,
                entityId: updated[0]!.id,
                action: "updated",
                actor,
                summary: `Changed display order for ${updated.length} ${context} record(s).`,
                isDemo: updated.some((r) => r.isDemo),
              })
            )
          );
        }

        return updated;
      });
    },

    async isMachineKeyTaken(machineKey, excludeId) {
      const all = await table.toArray();
      return isDuplicateMachineKey(machineKey, all, excludeId);
    },

    async isDisplayNameTaken(name, excludeId) {
      const all = await table.toArray();
      return isDuplicateDisplayName(name, all, excludeId);
    },

    async listActiveReplacementTargets(excludeId) {
      const all = await crud.list();
      return all.filter((r) => r.id !== excludeId && r.status !== "archived");
    },

    async getUsage(id) {
      const bundle = await buildDataBundle();
      return computeTaxonomyUsage(kind, id, bundle);
    },

    async replaceReferences(sourceId, targetId, actor, archiveSourceAfter) {
      if (sourceId === targetId) {
        throw new InvalidReplacementTargetError("Choose a different record to replace this one with.");
      }
      const source = await table.get(sourceId as never);
      if (!source) throw new InvalidReplacementTargetError("The original record could not be found.");
      const target = await table.get(targetId as never);
      if (!target) throw new InvalidReplacementTargetError("The replacement record could not be found.");
      if (target.status === "archived") {
        throw new InvalidReplacementTargetError("An archived record cannot be used as a replacement target.");
      }

      const bundle = await buildDataBundle();
      const plan = planReferenceReplacement(kind, sourceId, targetId, bundle);

      return db.transaction(
        "rw",
        [table, db.auditEvents, db.documents, db.microcards, db.rightsContent, db.supportOrganisations, db.supportProfessionals, db.reportingDestinations, db.matchingRules, db.incidentTypes],
        async () => {
          for (const entry of plan) {
            await applyReferenceReplacementPlan(db, kind, entry, actor);
          }

          await db.auditEvents.put(
            auditEventSchema.parse(
              createAuditEvent({
                entityType: auditEntityType,
                entityId: sourceId,
                action: "updated",
                actor,
                summary: `Replaced ${plan.length} reference(s) to "${source.name}" with "${target.name}".`,
                isDemo: source.isDemo,
              })
            )
          );

          if (archiveSourceAfter) {
            const freshSource = await table.get(sourceId as never);
            if (freshSource && freshSource.status !== "archived") {
              const archived = schema.parse({
                ...freshSource,
                status: "archived" as ContentStatus,
                updatedAt: nowIso(),
                updatedBy: actor,
                version: freshSource.version + 1,
              });
              await table.put(archived);
              await db.auditEvents.put(
                auditEventSchema.parse(
                  createAuditEvent({
                    entityType: auditEntityType,
                    entityId: sourceId,
                    action: "status_changed",
                    actor,
                    previousStatus: freshSource.status,
                    nextStatus: "archived",
                    summary: `"${archived.name}" archived after its references were replaced by "${target.name}".`,
                    isDemo: archived.isDemo,
                  })
                )
              );
            }
          }

          return { updatedRecordCount: plan.length };
        }
      );
    },
  };
}

interface PublishableContentRecordShape {
  id: string;
  status: ContentStatus;
  isDemo: boolean;
  createdBy: string;
  updatedBy: string;
  version: number;
}

/**
 * One generic factory backing Microcards, Rights & Legal Information, and
 * (Phase 5) the three Support Directory domains — the publishable-content
 * counterpart to `createTaxonomyRepository`, minus the machine-key/
 * replace-references machinery those three don't need.
 * `getBlockers`/`buildEligibilityContext` are injected per entity exactly
 * like the taxonomy factory does, and `buildEligibilityContext` is in
 * practice always `buildTaxonomyDataBundle` (see below) — every field
 * any eligibility module needs (resourceCategories, documents,
 * supportOrganisations, supportProfessionals, reportingDestinations,
 * rightsContent) is already part of `TaxonomyDataBundle`, so no second
 * data-bundle type was introduced. `getLabel` supplies the human-readable
 * name used in audit summaries — each entity calls its own display field
 * `title`/`name`/`fullName`, so this is a callback rather than a fixed
 * `title` field every T would otherwise be forced to have.
 */
function createPublishableContentRepository<T extends PublishableContentRecordShape>(
  db: AdminDatabase,
  table: EntityTable<T, "id">,
  schema: ZodType<T>,
  context: string,
  kind: DependencyKind,
  auditEntityType: AuditEntityType,
  getBlockers: (record: T, eligibilityContext: TaxonomyDataBundle) => string[],
  buildEligibilityContext: () => Promise<TaxonomyDataBundle>,
  getLabel: (record: T) => string
): PublishableContentRepository<T> {
  const crud = createCrudRepository<T>(table, schema, context);

  return {
    ...crud,

    async create(record) {
      return db.transaction("rw", [table, db.auditEvents], async () => {
        const validated = schema.parse(record);
        await table.put(validated);
        await db.auditEvents.put(
          auditEventSchema.parse(
            createAuditEvent({
              entityType: auditEntityType,
              entityId: validated.id,
              action: "created",
              actor: validated.createdBy,
              nextStatus: validated.status,
              summary: `Created "${getLabel(validated)}".`,
              isDemo: validated.isDemo,
            })
          )
        );
        return validated;
      });
    },

    async updateWithVersionCheck(id, patch, expectedVersion, actor) {
      return db.transaction("rw", [table], async () => {
        const existing = await table.get(id as never);
        if (!existing) throw new Error(`${context} "${id}" was not found.`);
        if ((existing.version ?? 1) !== expectedVersion) {
          throw new VersionConflictError(
            `This ${context} record was updated elsewhere since you started editing. Reload to see the latest version before saving again.`
          );
        }
        const merged = schema.parse({
          ...existing,
          ...patch,
          updatedAt: nowIso(),
          updatedBy: actor,
          version: existing.version + 1,
        });
        await table.put(merged);
        return merged;
      });
    },

    async transitionStatus(id, nextStatus, actor) {
      // Reads across every referencing domain, so it must run before the
      // transaction starts — see lib/repositories/errors.ts / the
      // deleteDraft() fix this mirrors: a Dexie transaction can only touch
      // tables explicitly listed in its own scope.
      const eligibilityContext = await buildEligibilityContext();

      return db.transaction("rw", [table, db.auditEvents], async () => {
        const existing = await table.get(id as never);
        if (!existing) throw new Error(`${context} "${id}" was not found.`);

        const blockers = getBlockers(existing, eligibilityContext);
        const guard = taxonomyPublishGuard(blockers);
        const decision = canTransitionStatus(existing.status, nextStatus, guard);
        if (!decision.allowed) {
          throw new StatusTransitionError(decision.reason ?? "This status change is not allowed.");
        }

        const merged = schema.parse({
          ...existing,
          status: nextStatus,
          // publishedDate is set once, the first time a record reaches "published", and never overwritten on later transitions.
          ...(nextStatus === "published" && !("publishedDate" in existing && (existing as { publishedDate?: string }).publishedDate)
            ? { publishedDate: nowIso() }
            : {}),
          updatedAt: nowIso(),
          updatedBy: actor,
          version: existing.version + 1,
        });
        await table.put(merged);
        await db.auditEvents.put(
          auditEventSchema.parse(
            createAuditEvent({
              entityType: auditEntityType,
              entityId: id,
              action: "status_changed",
              actor,
              previousStatus: existing.status,
              nextStatus,
              summary: `"${getLabel(merged)}" moved from ${existing.status.replace(/_/g, " ")} to ${nextStatus.replace(/_/g, " ")}.`,
              isDemo: merged.isDemo,
            })
          )
        );
        return merged;
      });
    },

    async deleteDraft(id, actor) {
      const eligibilityContext = await buildEligibilityContext();

      await db.transaction("rw", [table, db.auditEvents], async () => {
        const existing = await table.get(id as never);
        if (!existing) return;
        if (existing.status !== "draft") {
          throw new InvalidDeletionError(`Only draft ${context} records can be permanently deleted. Use Archive for published or in-review content.`);
        }

        const usage = computeTaxonomyUsage(kind, id, eligibilityContext);
        if (usage.totalCount > 0) {
          throw new InvalidDeletionError(
            `This ${context} record is used by ${usage.totalCount} other record(s) and cannot be deleted. Use Archive instead.`
          );
        }

        await table.delete(id as never);
        await db.auditEvents.put(
          auditEventSchema.parse(
            createAuditEvent({
              entityType: auditEntityType,
              entityId: id,
              action: "deleted",
              actor,
              summary: `Deleted local draft "${getLabel(existing)}".`,
              isDemo: existing.isDemo,
            })
          )
        );
      });
    },

    async getUsage(id) {
      const eligibilityContext = await buildEligibilityContext();
      return computeTaxonomyUsage(kind, id, eligibilityContext);
    },
  };
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

    async applyExtractionResult(
      id: string,
      result: ExtractionResult,
      audit: AuditContext
    ): Promise<DocumentRecord> {
      return db.transaction("rw", [db.documents, db.documentChunks, db.auditEvents], async () => {
        const existing = await db.documents.get(id);
        if (!existing) throw new Error(`document "${id}" was not found.`);

        const merged = documentSchema.parse({
          ...existing,
          file: result.file,
          processingStatus: result.processingStatus,
          extractionStatus: result.extractionStatus,
          localPreviewStatus: result.extractionStatus === "extracted" ? "available" : existing.localPreviewStatus,
          extractedTextPreview: result.extractedTextPreview ?? existing.extractedTextPreview,
          processingIssue: result.processingIssue,
          updatedAt: nowIso(),
          updatedBy: audit.actor,
          version: (existing.version ?? 1) + 1,
        });

        await db.documents.put({ ...merged, fileBlob: result.blob });

        const existingChunkIds = await db.documentChunks.where("documentId").equals(id).primaryKeys();
        await db.documentChunks.bulkDelete(existingChunkIds);
        await db.documentChunks.bulkPut(result.chunks.map((chunk) => documentChunkSchema.parse(chunk)));

        await db.auditEvents.put(
          auditEventSchema.parse(
            createAuditEvent({
              entityType: "document",
              entityId: id,
              action: audit.action,
              actor: audit.actor,
              summary: audit.summary,
              isDemo: merged.isDemo,
            })
          )
        );

        return merged;
      });
    },

    async transitionStatus(id: string, nextStatus: ContentStatus, actor: string): Promise<DocumentRecord> {
      return db.transaction("rw", [db.documents, db.auditEvents], async () => {
        const existing = await db.documents.get(id);
        if (!existing) throw new Error(`document "${id}" was not found.`);
        const parsedExisting = documentSchema.parse(existing);

        const guard = legislationPublishGuard({ ...parsedExisting, fileBlob: existing.fileBlob });
        const decision = canTransitionStatus(parsedExisting.status, nextStatus, guard);
        if (!decision.allowed) {
          throw new StatusTransitionError(decision.reason ?? "This status change is not allowed.");
        }

        const merged = documentSchema.parse({
          ...parsedExisting,
          status: nextStatus,
          updatedAt: nowIso(),
          updatedBy: actor,
          version: parsedExisting.version + 1,
        });
        await db.documents.put({ ...merged, fileBlob: existing.fileBlob });

        await db.auditEvents.put(
          auditEventSchema.parse(
            createAuditEvent({
              entityType: "document",
              entityId: id,
              action: "status_changed",
              actor,
              previousStatus: parsedExisting.status,
              nextStatus,
              summary: `"${merged.title}" moved from ${parsedExisting.status.replace(/_/g, " ")} to ${nextStatus.replace(/_/g, " ")}.`,
              isDemo: merged.isDemo,
            })
          )
        );

        return merged;
      });
    },

    async updateWithVersionCheck(
      id: string,
      patch: Partial<DocumentRecord>,
      expectedVersion: number,
      actor: string
    ): Promise<DocumentRecord> {
      return db.transaction("rw", db.documents, async () => {
        const existing = await db.documents.get(id);
        if (!existing) throw new Error(`document "${id}" was not found.`);
        if ((existing.version ?? 1) !== expectedVersion) {
          throw new VersionConflictError(
            "This document was updated elsewhere since you started editing. Reload to see the latest version before saving again."
          );
        }
        const merged = documentSchema.parse({
          ...existing,
          ...patch,
          updatedAt: nowIso(),
          updatedBy: actor,
          version: existing.version + 1,
        });
        await db.documents.put({ ...merged, fileBlob: patch.fileBlob ?? existing.fileBlob });
        return merged;
      });
    },

    async deleteDraft(id: string, actor: string): Promise<void> {
      await db.transaction("rw", [db.documents, db.documentChunks, db.auditEvents], async () => {
        const existing = await db.documents.get(id);
        if (!existing) return;
        if (existing.status !== "draft") {
          throw new InvalidDeletionError(
            "Only draft documents can be permanently deleted. Use Archive for published or in-review content."
          );
        }

        const chunkIds = await db.documentChunks.where("documentId").equals(id).primaryKeys();
        await db.documentChunks.bulkDelete(chunkIds);
        await db.documents.delete(id);

        await db.auditEvents.put(
          auditEventSchema.parse(
            createAuditEvent({
              entityType: "document",
              entityId: id,
              action: "deleted",
              actor,
              summary: `Deleted local draft "${existing.title}" and its local file and chunks.`,
              isDemo: existing.isDemo,
            })
          )
        );
      });
    },

    async listOverdueForReview(): Promise<DocumentRecord[]> {
      const all = await documentsCrud.list();
      return all.filter((doc) => isReviewOverdue(doc));
    },
  };
  const microcardsBase = createPublishableContentRepository<Microcard>(
    db,
    db.microcards,
    microcardSchema,
    "microcard",
    "microcard",
    "microcard",
    getMicrocardBlockers,
    () => buildTaxonomyDataBundle(),
    (record) => record.title
  );
  const microcards = {
    ...microcardsBase,
    async reorder(orderedIds: string[], actor: string): Promise<Microcard[]> {
      return db.transaction("rw", [db.microcards, db.auditEvents], async () => {
        const all = await db.microcards.toArray();
        const byId = new Map(all.map((r) => [r.id, r]));
        const updated: Microcard[] = [];

        for (let index = 0; index < orderedIds.length; index += 1) {
          const record = byId.get(orderedIds[index]!);
          if (!record || record.displayOrder === index) continue;
          const merged = microcardSchema.parse({
            ...record,
            displayOrder: index,
            updatedAt: nowIso(),
            updatedBy: actor,
            version: record.version + 1,
          });
          await db.microcards.put(merged);
          updated.push(merged);
        }

        if (updated.length > 0) {
          await db.auditEvents.put(
            auditEventSchema.parse(
              createAuditEvent({
                entityType: "microcard",
                entityId: updated[0]!.id,
                action: "updated",
                actor,
                summary: `Changed display order for ${updated.length} microcard record(s).`,
                isDemo: updated.some((r) => r.isDemo),
              })
            )
          );
        }

        return updated;
      });
    },
  };
  const rightsContent = createPublishableContentRepository<RightsContent>(
    db,
    db.rightsContent,
    rightsContentSchema,
    "rights content",
    "rights_content",
    "rights_content",
    getRightsContentBlockers,
    () => buildTaxonomyDataBundle(),
    (record) => record.title
  );
  const supportOrganisations = createPublishableContentRepository<SupportOrganisation>(
    db,
    db.supportOrganisations,
    supportOrganisationSchema,
    "support organisation",
    "support_organisation",
    "support_organisation",
    getSupportOrganisationBlockers,
    () => buildTaxonomyDataBundle(),
    (record) => record.name
  );
  const supportProfessionalsBase = createPublishableContentRepository<SupportProfessional>(
    db,
    db.supportProfessionals,
    supportProfessionalSchema,
    "support professional",
    "support_professional",
    "support_professional",
    getProfessionalBlockers,
    () => buildTaxonomyDataBundle(),
    (record) => record.fullName
  );
  const supportProfessionals = {
    ...supportProfessionalsBase,
    async setProfileImage(
      id: string,
      blob: Blob,
      meta: SupportProfessional["profilePhoto"],
      actor: string
    ): Promise<void> {
      await db.transaction("rw", [db.supportProfessionals, db.auditEvents], async () => {
        const existing = await db.supportProfessionals.get(id);
        if (!existing) throw new Error(`support professional "${id}" was not found.`);
        const hadImageBefore = Boolean(existing.profilePhoto);
        await db.supportProfessionals.update(id, {
          profilePhoto: meta,
          profilePhotoBlob: blob,
          updatedAt: nowIso(),
          updatedBy: actor,
          version: existing.version + 1,
        } as Partial<SupportProfessional>);
        await db.auditEvents.put(
          auditEventSchema.parse(
            createAuditEvent({
              entityType: "support_professional",
              entityId: id,
              action: "updated",
              actor,
              summary: `${hadImageBefore ? "Replaced" : "Added"} the profile image for "${existing.fullName}".`,
              isDemo: existing.isDemo,
            })
          )
        );
      });
    },
    async getProfileImage(id: string): Promise<Blob | undefined> {
      const row = await db.supportProfessionals.get(id);
      return row?.profilePhotoBlob;
    },
    async removeProfileImage(id: string, actor: string): Promise<void> {
      await db.transaction("rw", [db.supportProfessionals, db.auditEvents], async () => {
        const existing = await db.supportProfessionals.get(id);
        if (!existing || !existing.profilePhoto) return;
        await db.supportProfessionals.update(id, {
          profilePhoto: undefined,
          profilePhotoBlob: undefined,
          updatedAt: nowIso(),
          updatedBy: actor,
          version: existing.version + 1,
        } as Partial<SupportProfessional>);
        await db.auditEvents.put(
          auditEventSchema.parse(
            createAuditEvent({
              entityType: "support_professional",
              entityId: id,
              action: "updated",
              actor,
              summary: `Removed the profile image for "${existing.fullName}".`,
              isDemo: existing.isDemo,
            })
          )
        );
      });
    },
  };
  const reportingDestinations = createPublishableContentRepository<ReportingDestination>(
    db,
    db.reportingDestinations,
    reportingDestinationSchema,
    "reporting destination",
    "reporting_destination",
    "reporting_destination",
    getDestinationBlockers,
    () => buildTaxonomyDataBundle(),
    (record) => record.name
  );
  const matchingRules = createPublishableContentRepository<MatchingRule>(
    db,
    db.matchingRules,
    matchingRuleSchema,
    "matching rule",
    "matching_rule",
    "matching_rule",
    getMatchingRuleBlockers,
    () => buildTaxonomyDataBundle(),
    (record) => record.name
  );

  /**
   * Fetched fresh on every usage/replace call rather than cached — taxonomy
   * dependency checks must reflect the current state of every referencing
   * domain, and these are small local datasets so re-fetching is cheap.
   */
  async function buildTaxonomyDataBundle(): Promise<TaxonomyDataBundle> {
    const [docs, cards, rights, orgs, professionals, destinations, rules, types, labels, categories] = await Promise.all([
      documentsCrud.list(),
      microcards.list(),
      rightsContent.list(),
      supportOrganisations.list(),
      supportProfessionals.list(),
      reportingDestinations.list(),
      matchingRules.list(),
      db.incidentTypes.toArray(),
      db.triageLabels.toArray(),
      db.resourceCategories.toArray(),
    ]);
    return {
      documents: docs,
      microcards: cards,
      rightsContent: rights,
      supportOrganisations: orgs,
      supportProfessionals: professionals,
      reportingDestinations: destinations,
      matchingRules: rules,
      incidentTypes: types,
      triageLabels: labels,
      resourceCategories: categories,
    };
  }

  const incidentTypes = createTaxonomyRepository<IncidentType>(
    db,
    db.incidentTypes,
    incidentTypeSchema,
    "incident type",
    "incident_type",
    "incident_type",
    getIncidentTypeBlockers,
    buildTaxonomyDataBundle
  );
  const triageLabels = createTaxonomyRepository<TriageLabel>(
    db,
    db.triageLabels,
    triageLabelSchema,
    "triage label",
    "triage_label",
    "triage_label",
    getTriageLabelBlockers,
    buildTaxonomyDataBundle
  );
  const resourceCategories = createTaxonomyRepository<ResourceCategory>(
    db,
    db.resourceCategories,
    resourceCategorySchema,
    "resource category",
    "resource_category",
    "resource_category",
    getResourceCategoryBlockers,
    buildTaxonomyDataBundle
  );

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

  const adminAccount = {
    async get(): Promise<AdminAccount> {
      const row = await db.adminAccount.get(ADMIN_ACCOUNT_ID);
      if (row) {
        const parsed = adminAccountSchema.safeParse(row);
        if (parsed.success) return parsed.data;
      }
      const defaults = adminAccountSchema.parse({
        id: ADMIN_ACCOUNT_ID,
        updatedAt: nowIso(),
      });
      await db.adminAccount.put(defaults);
      return defaults;
    },
    async update(patch: Partial<AdminAccount>): Promise<AdminAccount> {
      const current = await adminAccount.get();
      const merged = adminAccountSchema.parse({ ...current, ...patch, updatedAt: nowIso() });
      await db.adminAccount.put(merged);
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
    const [docs, cards, rights, orgs, professionals, destinations, rules, recentActivity] = await Promise.all([
      documents.list(),
      microcards.list(),
      rightsContent.list(),
      supportOrganisations.list(),
      supportProfessionals.list(),
      reportingDestinations.list(),
      matchingRules.list(),
      db.auditEvents.orderBy("timestamp").reverse().limit(8).toArray(),
    ]);

    const publishable = [...docs, ...cards, ...rights];
    const publishedCount = publishable.filter((r) => r.status === "published").length;
    const draftCount = publishable.filter((r) => r.status === "draft").length;
    const readyForReviewCount = publishable.filter((r) => r.status === "ready_for_review").length;
    const needsUpdateCount = publishable.filter((r) => r.status === "needs_update").length;
    const ragReadyDocumentCount = docs.filter((d) => d.processingStatus === "ready_for_ai_processing").length;

    const educationalContent = [...cards, ...rights];

    const publishedProfessionals = professionals.filter((p) => p.status === "published");
    const supportDirectory: { status: ContentStatus; reviewDate?: string }[] = [
      ...orgs.map((o) => ({ status: o.status, reviewDate: o.reviewDueDate })),
      ...professionals.map((p) => ({ status: p.status, reviewDate: p.nextReviewDate })),
      ...destinations.map((d) => ({ status: d.status, reviewDate: d.reviewDueDate })),
    ];

    const publishedMatchingRules = rules.filter((r) => r.status === "published");
    // Reuses the same eligibility function transitions rely on, so "broken" here always
    // matches what the record's own detail page/publish guard would report.
    const matchingRuleEligibilityContext = await buildTaxonomyDataBundle();
    const matchingRulesWithBrokenRelationshipsCount = rules
      .filter((r) => r.status === "published" || r.status === "ready_for_review" || r.status === "needs_update")
      .filter((r) => getMatchingRuleBlockers(r, matchingRuleEligibilityContext).length > 0).length;

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
      publishedMicrocardCount: cards.filter((c) => c.status === "published").length,
      draftMicrocardCount: cards.filter((c) => c.status === "draft").length,
      publishedRightsContentCount: rights.filter((r) => r.status === "published").length,
      rightsContentAwaitingReviewCount: rights.filter((r) => r.status === "ready_for_review").length,
      educationalContentNeedsUpdateCount: educationalContent.filter((c) => c.status === "needs_update").length,
      educationalContentReviewOverdueCount: educationalContent.filter((c) => isReviewDueOverdue(c.reviewDueDate)).length,
      publishedOrganisationCount: orgs.filter((o) => o.status === "published").length,
      organisationAwaitingReviewCount: orgs.filter((o) => o.status === "ready_for_review").length,
      verifiedOrganisationCount: orgs.filter((o) => o.verificationStatus === "verified").length,
      publishedProfessionalCount: publishedProfessionals.length,
      publishedUnverifiedProfessionalCount: publishedProfessionals.filter((p) => p.verificationStatus !== "verified").length,
      professionalAwaitingReviewCount: professionals.filter((p) => p.status === "ready_for_review").length,
      publishedDestinationCount: destinations.filter((d) => d.status === "published").length,
      destinationAwaitingReviewCount: destinations.filter((d) => d.status === "ready_for_review").length,
      supportDirectoryNeedsUpdateCount: supportDirectory.filter((r) => r.status === "needs_update").length,
      supportDirectoryReviewOverdueCount: supportDirectory.filter((r) => isReviewDueOverdue(r.reviewDate)).length,
      publishedMatchingRuleCount: publishedMatchingRules.length,
      enabledPublishedMatchingRuleCount: publishedMatchingRules.filter((r) => r.enabled).length,
      disabledPublishedMatchingRuleCount: publishedMatchingRules.filter((r) => !r.enabled).length,
      matchingRulesAwaitingReviewCount: rules.filter((r) => r.status === "ready_for_review").length,
      matchingRulesNeedsUpdateCount: rules.filter((r) => r.status === "needs_update").length,
      matchingRulesReviewOverdueCount: rules.filter((r) => isReviewDueOverdue(r.reviewDueDate)).length,
      matchingRulesWithBrokenRelationshipsCount,
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
        await db.incidentTypes.bulkPut(seedIncidentTypes);
        await db.triageLabels.bulkPut(seedTriageLabels);
        await db.resourceCategories.bulkPut(seedResourceCategories);
        await db.documents.bulkPut(seedDocuments);
        await db.documentChunks.bulkPut(seedDocumentChunks);
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
    async getRagReadinessSummary(): Promise<RagReadinessSummary> {
      return summarizeReadiness(await documentsCrud.list());
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
    adminAccount,
    bundleHistory,
    getDashboardSummary,

    async ensureSeeded(): Promise<void> {
      // Creates the singleton row (via its own get()'s put-if-missing) here,
      // in a plain transaction, before any component's useLiveQuery(() =>
      // adminAccount.get()) can run — a write performed *inside* a
      // dexie-react-hooks live query throws Dexie's ReadOnlyError, since the
      // read-side observer transaction is read-only.
      await adminAccount.get();

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
