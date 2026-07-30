import type { DocumentRecord } from "@/lib/models/document";
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
 * The one canonical place that knows which content domains can reference a
 * taxonomy record, and by which field. Confirmed by grepping the actual
 * schemas (not assumed): `incidentTypeIds` exists on documents, microcards,
 * rightsContent, supportOrganisations, supportProfessionals,
 * reportingDestinations, and matchingRules; `triageLabelIds` exists on
 * supportProfessionals and matchingRules; no domain referenced resource
 * categories before this phase, so the only source is the new
 * `incidentTypes.relatedResourceCategoryIds` field this phase adds. Nothing
 * here is invented — see docs/ARCHITECTURE.md.
 */
export interface TaxonomyDataBundle {
  documents: DocumentRecord[];
  microcards: Microcard[];
  rightsContent: RightsContent[];
  supportOrganisations: SupportOrganisation[];
  supportProfessionals: SupportProfessional[];
  reportingDestinations: ReportingDestination[];
  matchingRules: MatchingRule[];
  incidentTypes: IncidentType[];
  triageLabels: TriageLabel[];
  resourceCategories: ResourceCategory[];
}

export interface UsageReference {
  entityType: string;
  entityLabel: string;
  recordId: string;
  recordName: string;
  /** Only set when the destination module actually has a details route today. */
  detailHref?: string;
}

export interface UsageByType {
  entityType: string;
  entityLabel: string;
  count: number;
}

export interface UsageSummary {
  totalCount: number;
  references: UsageReference[];
  byEntityType: UsageByType[];
}

export type TaxonomyKind = "incident_type" | "triage_label" | "resource_category";

/**
 * `TaxonomyKind` plus the Phase 4 publishable-content domains and the
 * Phase 5 Support Directory domains. Widened only for
 * `computeTaxonomyUsage`/`findDanglingTaxonomyReferences` — Replace
 * References (`planReferenceReplacement`) stays scoped to `TaxonomyKind`
 * only, since none of these five have that workflow themselves (though a
 * taxonomy Replace References run does update *their* records when they
 * reference the taxonomy entity being replaced — see
 * `applyReferenceReplacementPlan` in indexeddb-admin-content-repository.ts).
 */
export type DependencyKind =
  | TaxonomyKind
  | "microcard"
  | "rights_content"
  | "support_organisation"
  | "support_professional"
  | "reporting_destination"
  | "matching_rule";

export interface DanglingReference {
  taxonomyKind: DependencyKind;
  missingId: string;
  entityType: string;
  entityLabel: string;
  recordId: string;
  recordName: string;
}

export interface ReferenceReplacementPlan {
  entityType: string;
  recordId: string;
  /** The full replacement value for that record's reference field (array fields keep every other id, de-duplicated, order preserved). */
  updatedIds: string[];
}

interface ReferenceSource<T> {
  records: T[];
  getIds: (record: T) => string[];
  getRecordId: (record: T) => string;
  getRecordName: (record: T) => string;
  entityType: string;
  entityLabel: string;
  detailHref?: (record: T) => string | undefined;
}

function buildIncidentTypeSources(data: TaxonomyDataBundle): ReferenceSource<unknown>[] {
  return [
    {
      records: data.documents,
      getIds: (r) => (r as DocumentRecord).incidentTypeIds,
      getRecordId: (r) => (r as DocumentRecord).id,
      getRecordName: (r) => (r as DocumentRecord).title,
      entityType: "document",
      entityLabel: "Knowledge & Legislation document",
      detailHref: (r) => `/content/knowledge-legislation/${(r as DocumentRecord).id}`,
    },
    {
      records: data.microcards,
      getIds: (r) => (r as Microcard).incidentTypeIds,
      getRecordId: (r) => (r as Microcard).id,
      getRecordName: (r) => (r as Microcard).title,
      entityType: "microcard",
      entityLabel: "Microcard",
    },
    {
      records: data.rightsContent,
      getIds: (r) => (r as RightsContent).incidentTypeIds,
      getRecordId: (r) => (r as RightsContent).id,
      getRecordName: (r) => (r as RightsContent).title,
      entityType: "rights_content",
      entityLabel: "Rights & Legal Information",
    },
    {
      records: data.supportOrganisations,
      getIds: (r) => (r as SupportOrganisation).incidentTypeIds,
      getRecordId: (r) => (r as SupportOrganisation).id,
      getRecordName: (r) => (r as SupportOrganisation).name,
      entityType: "support_organisation",
      entityLabel: "Support Organisation",
    },
    {
      records: data.supportProfessionals,
      getIds: (r) => (r as SupportProfessional).incidentTypeIds,
      getRecordId: (r) => (r as SupportProfessional).id,
      getRecordName: (r) => (r as SupportProfessional).fullName,
      entityType: "support_professional",
      entityLabel: "Advocate/Counsellor",
    },
    {
      records: data.reportingDestinations,
      getIds: (r) => (r as ReportingDestination).incidentTypeIds,
      getRecordId: (r) => (r as ReportingDestination).id,
      getRecordName: (r) => (r as ReportingDestination).name,
      entityType: "reporting_destination",
      entityLabel: "Reporting Destination",
    },
    {
      records: data.matchingRules,
      getIds: (r) => (r as MatchingRule).incidentTypeIds,
      getRecordId: (r) => (r as MatchingRule).id,
      getRecordName: (r) => (r as MatchingRule).name,
      entityType: "matching_rule",
      entityLabel: "Matching Rule",
    },
  ];
}

function buildTriageLabelSources(data: TaxonomyDataBundle): ReferenceSource<unknown>[] {
  return [
    {
      records: data.supportProfessionals,
      getIds: (r) => (r as SupportProfessional).triageLabelIds,
      getRecordId: (r) => (r as SupportProfessional).id,
      getRecordName: (r) => (r as SupportProfessional).fullName,
      entityType: "support_professional",
      entityLabel: "Advocate/Counsellor",
    },
    {
      records: data.matchingRules,
      getIds: (r) => (r as MatchingRule).triageLabelIds,
      getRecordId: (r) => (r as MatchingRule).id,
      getRecordName: (r) => (r as MatchingRule).name,
      entityType: "matching_rule",
      entityLabel: "Matching Rule",
    },
  ];
}

function buildResourceCategorySources(data: TaxonomyDataBundle): ReferenceSource<unknown>[] {
  return [
    {
      records: data.incidentTypes,
      getIds: (r) => (r as IncidentType).relatedResourceCategoryIds,
      getRecordId: (r) => (r as IncidentType).id,
      getRecordName: (r) => (r as IncidentType).name,
      entityType: "incident_type",
      entityLabel: "Incident Type",
      detailHref: (r) => `/taxonomy/incident-types/${(r as IncidentType).id}`,
    },
    {
      records: data.microcards,
      getIds: (r) => {
        const id = (r as Microcard).resourceCategoryId;
        return id ? [id] : [];
      },
      getRecordId: (r) => (r as Microcard).id,
      getRecordName: (r) => (r as Microcard).title,
      entityType: "microcard",
      entityLabel: "Microcard",
      detailHref: (r) => `/content/microcards/${(r as Microcard).id}`,
    },
    {
      records: data.rightsContent,
      getIds: (r) => (r as RightsContent).resourceCategoryIds,
      getRecordId: (r) => (r as RightsContent).id,
      getRecordName: (r) => (r as RightsContent).title,
      entityType: "rights_content",
      entityLabel: "Rights & Legal Information",
      detailHref: (r) => `/content/rights-legal-information/${(r as RightsContent).id}`,
    },
    {
      records: data.supportOrganisations,
      getIds: (r) => (r as SupportOrganisation).resourceCategoryIds,
      getRecordId: (r) => (r as SupportOrganisation).id,
      getRecordName: (r) => (r as SupportOrganisation).name,
      entityType: "support_organisation",
      entityLabel: "Support Organisation",
      detailHref: (r) => `/content/support-organisations/${(r as SupportOrganisation).id}`,
    },
    {
      records: data.supportProfessionals,
      getIds: (r) => (r as SupportProfessional).resourceCategoryIds,
      getRecordId: (r) => (r as SupportProfessional).id,
      getRecordName: (r) => (r as SupportProfessional).fullName,
      entityType: "support_professional",
      entityLabel: "Advocate/Counsellor",
      detailHref: (r) => `/content/advocates-counsellors/${(r as SupportProfessional).id}`,
    },
    {
      records: data.reportingDestinations,
      getIds: (r) => (r as ReportingDestination).resourceCategoryIds,
      getRecordId: (r) => (r as ReportingDestination).id,
      getRecordName: (r) => (r as ReportingDestination).name,
      entityType: "reporting_destination",
      entityLabel: "Reporting Destination",
      detailHref: (r) => `/content/reporting-destinations/${(r as ReportingDestination).id}`,
    },
  ];
}

/**
 * Whatever can reference a Support Organisation by stable id today
 * (confirmed by grep): Microcards/Rights Content's
 * `relatedSupportOrganisationIds`, a linked Support Professional's or
 * Reporting Destination's singular `organisationId`, and Matching Rules'
 * `supportOrganisationIds`.
 */
function buildSupportOrganisationSources(data: TaxonomyDataBundle): ReferenceSource<unknown>[] {
  return [
    {
      records: data.microcards,
      getIds: (r) => (r as Microcard).relatedSupportOrganisationIds,
      getRecordId: (r) => (r as Microcard).id,
      getRecordName: (r) => (r as Microcard).title,
      entityType: "microcard",
      entityLabel: "Microcard",
      detailHref: (r) => `/content/microcards/${(r as Microcard).id}`,
    },
    {
      records: data.rightsContent,
      getIds: (r) => (r as RightsContent).relatedSupportOrganisationIds,
      getRecordId: (r) => (r as RightsContent).id,
      getRecordName: (r) => (r as RightsContent).title,
      entityType: "rights_content",
      entityLabel: "Rights & Legal Information",
      detailHref: (r) => `/content/rights-legal-information/${(r as RightsContent).id}`,
    },
    {
      records: data.supportProfessionals,
      getIds: (r) => {
        const id = (r as SupportProfessional).organisationId;
        return id ? [id] : [];
      },
      getRecordId: (r) => (r as SupportProfessional).id,
      getRecordName: (r) => (r as SupportProfessional).fullName,
      entityType: "support_professional",
      entityLabel: "Advocate/Counsellor",
      detailHref: (r) => `/content/advocates-counsellors/${(r as SupportProfessional).id}`,
    },
    {
      records: data.reportingDestinations,
      getIds: (r) => {
        const id = (r as ReportingDestination).organisationId;
        return id ? [id] : [];
      },
      getRecordId: (r) => (r as ReportingDestination).id,
      getRecordName: (r) => (r as ReportingDestination).name,
      entityType: "reporting_destination",
      entityLabel: "Reporting Destination",
      detailHref: (r) => `/content/reporting-destinations/${(r as ReportingDestination).id}`,
    },
    {
      records: data.matchingRules,
      getIds: (r) => (r as MatchingRule).supportOrganisationIds,
      getRecordId: (r) => (r as MatchingRule).id,
      getRecordName: (r) => (r as MatchingRule).name,
      entityType: "matching_rule",
      entityLabel: "Matching Rule",
    },
  ];
}

/** Whatever can reference a Support Professional by stable id today: only Matching Rules' `supportProfessionalIds` (confirmed by grep). */
function buildSupportProfessionalSources(data: TaxonomyDataBundle): ReferenceSource<unknown>[] {
  return [
    {
      records: data.matchingRules,
      getIds: (r) => (r as MatchingRule).supportProfessionalIds,
      getRecordId: (r) => (r as MatchingRule).id,
      getRecordName: (r) => (r as MatchingRule).name,
      entityType: "matching_rule",
      entityLabel: "Matching Rule",
    },
  ];
}

/** Whatever can reference a Reporting Destination by stable id today: only Matching Rules' `reportingDestinationIds` (confirmed by grep). */
function buildReportingDestinationSources(data: TaxonomyDataBundle): ReferenceSource<unknown>[] {
  return [
    {
      records: data.matchingRules,
      getIds: (r) => (r as MatchingRule).reportingDestinationIds,
      getRecordId: (r) => (r as MatchingRule).id,
      getRecordName: (r) => (r as MatchingRule).name,
      entityType: "matching_rule",
      entityLabel: "Matching Rule",
    },
  ];
}

/** Whatever can reference a Microcard by stable id today: only Matching Rules' `microcardIds` (confirmed by grep, nothing else references microcards). */
function buildMicrocardSources(data: TaxonomyDataBundle): ReferenceSource<unknown>[] {
  return [
    {
      records: data.matchingRules,
      getIds: (r) => (r as MatchingRule).microcardIds,
      getRecordId: (r) => (r as MatchingRule).id,
      getRecordName: (r) => (r as MatchingRule).name,
      entityType: "matching_rule",
      entityLabel: "Matching Rule",
    },
  ];
}

/** Whatever can reference a Rights & Legal Information record by stable id today: only Matching Rules' `rightsContentIds`. */
function buildRightsContentSources(data: TaxonomyDataBundle): ReferenceSource<unknown>[] {
  return [
    {
      records: data.matchingRules,
      getIds: (r) => (r as MatchingRule).rightsContentIds,
      getRecordId: (r) => (r as MatchingRule).id,
      getRecordName: (r) => (r as MatchingRule).name,
      entityType: "matching_rule",
      entityLabel: "Matching Rule",
    },
  ];
}

/**
 * Nothing currently references a Matching Rule by id (matching rules only
 * ever point *outward* at other content, never the other way around) — this
 * empty source list exists purely so `computeTaxonomyUsage("matching_rule", ...)`
 * and `deleteDraft` resolve cleanly (zero usage, never dangling) instead of
 * falling through to the wrong builder.
 */
function buildMatchingRuleSources(): ReferenceSource<unknown>[] {
  return [];
}

function sourcesForKind(kind: DependencyKind, data: TaxonomyDataBundle): ReferenceSource<unknown>[] {
  if (kind === "incident_type") return buildIncidentTypeSources(data);
  if (kind === "triage_label") return buildTriageLabelSources(data);
  if (kind === "resource_category") return buildResourceCategorySources(data);
  if (kind === "microcard") return buildMicrocardSources(data);
  if (kind === "rights_content") return buildRightsContentSources(data);
  if (kind === "support_organisation") return buildSupportOrganisationSources(data);
  if (kind === "support_professional") return buildSupportProfessionalSources(data);
  if (kind === "reporting_destination") return buildReportingDestinationSources(data);
  return buildMatchingRuleSources();
}

function validIdsForKind(kind: DependencyKind, data: TaxonomyDataBundle): Set<string> {
  if (kind === "incident_type") return new Set(data.incidentTypes.map((t) => t.id));
  if (kind === "microcard") return new Set(data.microcards.map((t) => t.id));
  if (kind === "rights_content") return new Set(data.rightsContent.map((t) => t.id));
  if (kind === "triage_label") return new Set(data.triageLabels.map((t) => t.id));
  if (kind === "resource_category") return new Set(data.resourceCategories.map((t) => t.id));
  if (kind === "support_organisation") return new Set(data.supportOrganisations.map((t) => t.id));
  if (kind === "support_professional") return new Set(data.supportProfessionals.map((t) => t.id));
  if (kind === "reporting_destination") return new Set(data.reportingDestinations.map((t) => t.id));
  return new Set(data.matchingRules.map((t) => t.id));
}

export function computeTaxonomyUsage(kind: DependencyKind, targetId: string, data: TaxonomyDataBundle): UsageSummary {
  const references: UsageReference[] = [];
  for (const source of sourcesForKind(kind, data)) {
    for (const record of source.records) {
      if (source.getIds(record).includes(targetId)) {
        references.push({
          entityType: source.entityType,
          entityLabel: source.entityLabel,
          recordId: source.getRecordId(record),
          recordName: source.getRecordName(record),
          detailHref: source.detailHref?.(record),
        });
      }
    }
  }

  const byEntityTypeMap = new Map<string, UsageByType>();
  for (const ref of references) {
    const existing = byEntityTypeMap.get(ref.entityType);
    if (existing) existing.count += 1;
    else byEntityTypeMap.set(ref.entityType, { entityType: ref.entityType, entityLabel: ref.entityLabel, count: 1 });
  }

  return { totalCount: references.length, references, byEntityType: Array.from(byEntityTypeMap.values()) };
}

export function findDanglingTaxonomyReferences(kind: DependencyKind, data: TaxonomyDataBundle): DanglingReference[] {
  const validIds = validIdsForKind(kind, data);
  const result: DanglingReference[] = [];
  for (const source of sourcesForKind(kind, data)) {
    for (const record of source.records) {
      for (const refId of source.getIds(record)) {
        if (refId && !validIds.has(refId)) {
          result.push({
            taxonomyKind: kind,
            missingId: refId,
            entityType: source.entityType,
            entityLabel: source.entityLabel,
            recordId: source.getRecordId(record),
            recordName: source.getRecordName(record),
          });
        }
      }
    }
  }
  return result;
}

/**
 * Pure planning step for Replace References: for every record that
 * currently references `sourceId`, computes the field's full replacement
 * value (de-duplicated, order preserved) — it does not touch storage. The
 * repository applies each plan entry to the right Dexie table inside one
 * transaction, and rolls back entirely if any write fails.
 */
export function planReferenceReplacement(kind: TaxonomyKind, sourceId: string, targetId: string, data: TaxonomyDataBundle): ReferenceReplacementPlan[] {
  const plans: ReferenceReplacementPlan[] = [];
  for (const source of sourcesForKind(kind, data)) {
    for (const record of source.records) {
      const ids = source.getIds(record);
      if (!ids.includes(sourceId)) continue;
      const updatedIds = Array.from(new Set(ids.map((id) => (id === sourceId ? targetId : id))));
      plans.push({ entityType: source.entityType, recordId: source.getRecordId(record), updatedIds });
    }
  }
  return plans;
}
