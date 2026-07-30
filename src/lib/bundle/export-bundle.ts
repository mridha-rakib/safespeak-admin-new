import { z } from "zod";

import { toPublishedLegislationExport } from "@/lib/legislation/export-transform";
import type { ContentStatus } from "@/lib/models/base";
import {
  AI_ELIGIBILITY_POLICY_DESCRIPTION,
  BUNDLE_SCHEMA_VERSION,
  SOURCE_APPLICATION,
  type BundleDomain,
  type BundleManifest,
  type BundlePurpose,
} from "@/lib/models/content-bundle";
import { documentChunkSchema, documentSchema } from "@/lib/models/document";
import { incidentTypeSchema } from "@/lib/models/incident-type";
import { matchingRuleSchema } from "@/lib/models/matching-rule";
import { microcardSchema } from "@/lib/models/microcard";
import { nowIso } from "@/lib/models/base";
import { reportingDestinationSchema } from "@/lib/models/reporting-destination";
import { resourceCategorySchema } from "@/lib/models/resource-category";
import { rightsContentSchema } from "@/lib/models/rights-content";
import { supportOrganisationSchema } from "@/lib/models/support-organisation";
import { supportProfessionalSchema } from "@/lib/models/support-professional";
import { triageLabelSchema } from "@/lib/models/triage-label";
import type { AdminContentRepository } from "@/lib/repositories/admin-content-repository";
import { findDanglingTaxonomyReferences, type DependencyKind, type TaxonomyDataBundle } from "@/lib/taxonomy/dependency-service";
import {
  toPublishedIncidentTypeExport,
  toPublishedResourceCategoryExport,
  toPublishedTriageLabelExport,
} from "@/lib/taxonomy/export-transform";
import { toPublishedMicrocardExport } from "@/lib/microcards/export-transform";
import { toPublishedMatchingRuleExport } from "@/lib/matching-rules/export-transform";
import { toPublishedRightsContentExport } from "@/lib/rights-content/export-transform";
import { toPublishedOrganisationExport } from "@/lib/support-directory/organisation-export";
import { toPublishedProfessionalExport } from "@/lib/support-directory/professional-export";
import { toPublishedDestinationExport } from "@/lib/support-directory/destination-export";

export interface ContentBundle {
  manifest: BundleManifest;
  /** One JSON-serializable array per domain. Never contains Blob values, object URLs, or file-system paths. */
  data: Record<BundleDomain, unknown[]>;
}

export interface BuildBundleOptions {
  purpose: BundlePurpose;
  includeDemoData: boolean;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Validates every record against its own Zod schema before including it.
 * Records that fail validation are excluded and reported as a warning —
 * export continues rather than blocking entirely, since one corrupt record
 * should not prevent everything else from exporting.
 */
function validateDomain<T>(schema: z.ZodType<T>, records: unknown[], domain: BundleDomain, warnings: string[]): T[] {
  const valid: T[] = [];
  for (const record of records) {
    const result = schema.safeParse(record);
    if (result.success) {
      valid.push(result.data);
    } else {
      warnings.push(`Excluded 1 invalid "${domain}" record from the export.`);
    }
  }
  return valid;
}

/**
 * Published Content Bundle (the default, user-facing export): only
 * `status === "published"` records. Admin Backup: every local status, for
 * local restoration only — never mistake it for the user-facing bundle.
 */
function statusFilter<T extends { status: ContentStatus }>(records: T[], purpose: BundlePurpose): T[] {
  return purpose === "published_content" ? records.filter((r) => r.status === "published") : records;
}

export async function buildContentBundle(
  repository: AdminContentRepository,
  options: BuildBundleOptions
): Promise<ContentBundle> {
  const warnings: string[] = [];
  const includedStatuses: ContentStatus[] =
    options.purpose === "published_content"
      ? ["published"]
      : ["draft", "ready_for_review", "published", "needs_update", "archived"];

  const [documents, microcards, rightsContent, supportOrganisations, supportProfessionals, reportingDestinations, incidentTypes, triageLabels, resourceCategories, matchingRules] =
    await Promise.all([
      repository.documents.list(),
      repository.microcards.list(),
      repository.rightsContent.list(),
      repository.supportOrganisations.list(),
      repository.supportProfessionals.list(),
      repository.reportingDestinations.list(),
      repository.incidentTypes.list(),
      repository.triageLabels.list(),
      repository.resourceCategories.list(),
      repository.matchingRules.list(),
    ]);

  const filterDemo = <T extends { isDemo: boolean }>(records: T[]) =>
    options.includeDemoData ? records : records.filter((r) => !r.isDemo);

  const eligibleDocuments = statusFilter(
    filterDemo(validateDomain(documentSchema, documents, "legislation", warnings)),
    options.purpose
  );
  const includedDocIds = new Set(eligibleDocuments.map((d) => d.id));

  const allChunks = (
    await Promise.all(documents.map((doc) => repository.documentChunks.listForDocument(doc.id)))
  ).flat();
  const eligibleChunks = validateDomain(documentChunkSchema, allChunks, "documentChunks", warnings).filter((chunk) =>
    includedDocIds.has(chunk.documentId)
  );

  const legislationExport =
    options.purpose === "published_content" ? eligibleDocuments.map(toPublishedLegislationExport) : eligibleDocuments;

  const eligibleMicrocards = statusFilter(filterDemo(validateDomain(microcardSchema, microcards, "microcards", warnings)), options.purpose);
  const eligibleRightsContent = statusFilter(
    filterDemo(validateDomain(rightsContentSchema, rightsContent, "rightsContent", warnings)),
    options.purpose
  );
  const eligibleSupportOrganisations = statusFilter(
    filterDemo(validateDomain(supportOrganisationSchema, supportOrganisations, "supportOrganisations", warnings)),
    options.purpose
  );
  const eligibleSupportProfessionals = statusFilter(
    filterDemo(validateDomain(supportProfessionalSchema, supportProfessionals, "supportProfessionals", warnings)),
    options.purpose
  );
  const eligibleReportingDestinations = statusFilter(
    filterDemo(validateDomain(reportingDestinationSchema, reportingDestinations, "reportingDestinations", warnings)),
    options.purpose
  );
  const eligibleIncidentTypes = statusFilter(
    filterDemo(validateDomain(incidentTypeSchema, incidentTypes, "incidentTypes", warnings)),
    options.purpose
  );
  const eligibleTriageLabels = statusFilter(
    filterDemo(validateDomain(triageLabelSchema, triageLabels, "triageLabels", warnings)),
    options.purpose
  );
  const eligibleResourceCategories = statusFilter(
    filterDemo(validateDomain(resourceCategorySchema, resourceCategories, "resourceCategories", warnings)),
    options.purpose
  );
  const eligibleMatchingRules = statusFilter(
    filterDemo(validateDomain(matchingRuleSchema, matchingRules, "matchingRules", warnings)),
    options.purpose
  );

  /**
   * `getMatchingRuleBlockers` already stops a rule from *newly publishing*
   * with a recommendation pointing at unpublished content, but a rule that
   * was valid when it was published can still end up pointing at something
   * that this specific export leaves out (e.g. `includeDemoData: false`
   * strips a demo microcard a demo rule still recommends). Disabled
   * published rules are NOT filtered out here — per Phase 6 spec, they stay
   * in the public bundle for inspection/version parity; only the mock
   * matching engine (built elsewhere) skips them at execution time. Admin
   * Backup always keeps the full, unfiltered set.
   */
  const eligibleMicrocardIds = new Set(eligibleMicrocards.map((c) => c.id));
  const eligibleRightsContentIds = new Set(eligibleRightsContent.map((r) => r.id));
  const eligibleSupportOrganisationIds = new Set(eligibleSupportOrganisations.map((o) => o.id));
  const eligibleSupportProfessionalIds = new Set(eligibleSupportProfessionals.map((p) => p.id));
  const eligibleReportingDestinationIds = new Set(eligibleReportingDestinations.map((d) => d.id));
  const eligibleLegislationIds = new Set(eligibleDocuments.map((d) => d.id));
  const publishedMatchingRules =
    options.purpose === "published_content"
      ? eligibleMatchingRules.filter((rule) => {
          const referencesExcludedContent =
            rule.microcardIds.some((id) => !eligibleMicrocardIds.has(id)) ||
            rule.rightsContentIds.some((id) => !eligibleRightsContentIds.has(id)) ||
            rule.supportOrganisationIds.some((id) => !eligibleSupportOrganisationIds.has(id)) ||
            rule.supportProfessionalIds.some((id) => !eligibleSupportProfessionalIds.has(id)) ||
            rule.reportingDestinationIds.some((id) => !eligibleReportingDestinationIds.has(id)) ||
            rule.legislationIds.some((id) => !eligibleLegislationIds.has(id));
          if (referencesExcludedContent) {
            warnings.push(`Matching rule "${rule.name}" was excluded from this export because it references content not included in it.`);
          }
          return !referencesExcludedContent;
        })
      : eligibleMatchingRules;

  /**
   * findDanglingTaxonomyReferences flags any reference that points outside
   * the given bundle — passing it exactly the record sets that will ship in
   * this export means "dangling" here means "not included in this export"
   * (e.g. a published document referencing a draft incident type), not just
   * "id never existed." See README "Published Content Bundle vs Admin
   * Backup" for why that distinction matters for a frontend consumer.
   */
  const exportedTaxonomyBundle: TaxonomyDataBundle = {
    documents: eligibleDocuments,
    microcards: eligibleMicrocards,
    rightsContent: eligibleRightsContent,
    supportOrganisations: eligibleSupportOrganisations,
    supportProfessionals: eligibleSupportProfessionals,
    reportingDestinations: eligibleReportingDestinations,
    matchingRules: eligibleMatchingRules,
    incidentTypes: eligibleIncidentTypes,
    triageLabels: eligibleTriageLabels,
    resourceCategories: eligibleResourceCategories,
  };
  const dependencyKinds: DependencyKind[] = [
    "incident_type",
    "triage_label",
    "resource_category",
    "microcard",
    "rights_content",
    "support_organisation",
    "support_professional",
    "reporting_destination",
  ];
  for (const kind of dependencyKinds) {
    for (const dangling of findDanglingTaxonomyReferences(kind, exportedTaxonomyBundle)) {
      warnings.push(
        `"${dangling.recordName}" (${dangling.entityLabel}) references a ${kind.replace("_", " ")} that is not included in this export.`
      );
    }
  }

  /**
   * A Microcard's call-to-action can target a Rights & Legal Information
   * record, a legislation document, or a support organisation by id —
   * `findDanglingTaxonomyReferences` doesn't model CTA targets as a
   * reference source (they're not a taxonomy-shaped relationship), so a CTA
   * pointing at a since-filtered-out record is checked directly here.
   */
  for (const card of eligibleMicrocards) {
    if (card.cta.type === "view_rights_information" && card.cta.target && !eligibleRightsContent.some((r) => r.id === card.cta.target)) {
      warnings.push(`"${card.title}" (Microcard) has a call-to-action pointing to a Rights & Legal Information record that is not included in this export.`);
    }
    if (card.cta.type === "view_legislation_source" && card.cta.target && !eligibleDocuments.some((d) => d.id === card.cta.target)) {
      warnings.push(`"${card.title}" (Microcard) has a call-to-action pointing to a legislation source that is not included in this export.`);
    }
    if (card.cta.type === "view_support_service" && card.cta.target && !eligibleSupportOrganisations.some((o) => o.id === card.cta.target)) {
      warnings.push(`"${card.title}" (Microcard) has a call-to-action pointing to a support service that is not included in this export.`);
    }
  }

  const data: Record<BundleDomain, unknown[]> = {
    legislation: legislationExport,
    documentChunks: eligibleChunks,
    microcards: options.purpose === "published_content" ? eligibleMicrocards.map(toPublishedMicrocardExport) : eligibleMicrocards,
    rightsContent:
      options.purpose === "published_content" ? eligibleRightsContent.map(toPublishedRightsContentExport) : eligibleRightsContent,
    supportOrganisations:
      options.purpose === "published_content" ? eligibleSupportOrganisations.map(toPublishedOrganisationExport) : eligibleSupportOrganisations,
    supportProfessionals:
      options.purpose === "published_content" ? eligibleSupportProfessionals.map(toPublishedProfessionalExport) : eligibleSupportProfessionals,
    reportingDestinations:
      options.purpose === "published_content" ? eligibleReportingDestinations.map(toPublishedDestinationExport) : eligibleReportingDestinations,
    incidentTypes:
      options.purpose === "published_content" ? eligibleIncidentTypes.map(toPublishedIncidentTypeExport) : eligibleIncidentTypes,
    triageLabels:
      options.purpose === "published_content" ? eligibleTriageLabels.map(toPublishedTriageLabelExport) : eligibleTriageLabels,
    resourceCategories:
      options.purpose === "published_content"
        ? eligibleResourceCategories.map(toPublishedResourceCategoryExport)
        : eligibleResourceCategories,
    matchingRules:
      options.purpose === "published_content" ? publishedMatchingRules.map(toPublishedMatchingRuleExport) : eligibleMatchingRules,
  };

  const recordCounts = Object.fromEntries(
    Object.entries(data).map(([domain, records]) => [domain, records.length])
  ) as Record<BundleDomain, number>;

  const checksums = Object.fromEntries(
    await Promise.all(
      Object.entries(data).map(async ([domain, records]) => [domain, await sha256Hex(JSON.stringify(records))])
    )
  ) as Record<BundleDomain, string>;

  if (recordCounts.legislation > 0) {
    const documentsWithFiles = eligibleDocuments.filter((d) => d.file);
    if (documentsWithFiles.length > 0) {
      warnings.push(
        `${documentsWithFiles.length} document(s) have an uploaded PDF. Choose the ZIP export to include the underlying files.`
      );
    }
  }

  if (recordCounts.supportProfessionals > 0) {
    const professionalsWithImages = eligibleSupportProfessionals.filter((p) => p.profilePhoto);
    if (professionalsWithImages.length > 0) {
      warnings.push(
        `${professionalsWithImages.length} profile(s) have an uploaded image. Choose the ZIP export to include the underlying image files — the JSON export carries only the image metadata (file name, size, type), never the image itself.`
      );
    }
  }

  if (options.purpose === "admin_backup") {
    warnings.push(
      "This is an Admin Backup, not the Published Content Bundle — it may include drafts, in-review, needs-update, and archived records, and is not for user-frontend consumption."
    );
  }

  const manifest: BundleManifest = {
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    purpose: options.purpose,
    bundleVersion: nowIso(),
    generatedAt: nowIso(),
    sourceApplication: SOURCE_APPLICATION,
    format: "json",
    includesDemoData: options.includeDemoData,
    includesDocumentFiles: false,
    includedStatuses,
    aiEligibilityPolicy: AI_ELIGIBILITY_POLICY_DESCRIPTION,
    recordCounts,
    checksums,
    warnings,
  };

  return { manifest, data };
}

export function serializeBundleAsJson(bundle: ContentBundle): string {
  return JSON.stringify({ manifest: bundle.manifest, data: bundle.data }, null, 2);
}
