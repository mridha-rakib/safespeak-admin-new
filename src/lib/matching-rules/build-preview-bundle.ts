import type { PublishedMockContentBundle } from "@/lib/contract/published-content-contract";
import { toPublishedLegislationExport } from "@/lib/legislation/export-transform";
import { toPublishedMatchingRuleExport } from "@/lib/matching-rules/export-transform";
import { toPublishedMicrocardExport } from "@/lib/microcards/export-transform";
import { toPublishedRightsContentExport } from "@/lib/rights-content/export-transform";
import type { AdminContentRepository } from "@/lib/repositories/admin-content-repository";
import { toPublishedDestinationExport } from "@/lib/support-directory/destination-export";
import { toPublishedOrganisationExport } from "@/lib/support-directory/organisation-export";
import { toPublishedProfessionalExport } from "@/lib/support-directory/professional-export";
import {
  toPublishedIncidentTypeExport,
  toPublishedResourceCategoryExport,
  toPublishedTriageLabelExport,
} from "@/lib/taxonomy/export-transform";

/**
 * Builds the exact same `PublishedMockContentBundle["data"]` shape the real
 * Published Content Bundle export uses (see lib/bundle/export-bundle.ts) —
 * same `status === "published"` filter, same per-domain
 * `toPublishedXExport` transforms — but computed from the CURRENT LIVE admin
 * content in this browser's IndexedDB rather than a frozen, previously
 * generated JSON fixture. This is what powers the admin "Test Matching"
 * preview panel: "what would the mock matching engine recommend if I
 * published right now," including a Matching Rule that has never been
 * exported. Never a "simplified preview algorithm" — the ONE deterministic
 * mock matching engine (lib/matching-rules/engine.ts) is always run
 * downstream of this, unmodified.
 *
 * The `as PublishedMockContentBundle["data"]` cast at the end mirrors the
 * looser `Record<BundleDomain, unknown[]>` typing lib/bundle/export-bundle.ts
 * already uses for the same reason: each `toPublishedXExport` return type is
 * a hand-written field allow-list interface, not the generated zod type
 * itself, and the two are kept in parity by
 * `scripts/generate-mock-bundle.ts`'s parity check, not by the TypeScript
 * compiler here.
 */
export async function buildPreviewBundleData(repository: AdminContentRepository): Promise<PublishedMockContentBundle["data"]> {
  const [
    incidentTypes,
    triageLabels,
    resourceCategories,
    documents,
    microcards,
    rightsContent,
    supportOrganisations,
    supportProfessionals,
    reportingDestinations,
    matchingRules,
  ] = await Promise.all([
    repository.incidentTypes.list(),
    repository.triageLabels.list(),
    repository.resourceCategories.list(),
    repository.documents.list(),
    repository.microcards.list(),
    repository.rightsContent.list(),
    repository.supportOrganisations.list(),
    repository.supportProfessionals.list(),
    repository.reportingDestinations.list(),
    repository.matchingRules.list(),
  ]);

  const onlyPublished = <T extends { status: string }>(records: T[]): T[] => records.filter((record) => record.status === "published");

  return {
    incidentTypes: onlyPublished(incidentTypes).map(toPublishedIncidentTypeExport),
    triageLabels: onlyPublished(triageLabels).map(toPublishedTriageLabelExport),
    resourceCategories: onlyPublished(resourceCategories).map(toPublishedResourceCategoryExport),
    legislationSources: onlyPublished(documents).map(toPublishedLegislationExport),
    microcards: onlyPublished(microcards).map(toPublishedMicrocardExport),
    rightsContent: onlyPublished(rightsContent).map(toPublishedRightsContentExport),
    supportOrganisations: onlyPublished(supportOrganisations).map(toPublishedOrganisationExport),
    supportProfessionals: onlyPublished(supportProfessionals).map(toPublishedProfessionalExport),
    reportingDestinations: onlyPublished(reportingDestinations).map(toPublishedDestinationExport),
    matchingRules: onlyPublished(matchingRules).map(toPublishedMatchingRuleExport),
  } as PublishedMockContentBundle["data"];
}
