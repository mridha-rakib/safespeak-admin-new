import type { DocumentRecord } from "@/lib/models/document";
import type { ResourceCategory } from "@/lib/models/resource-category";
import type { RightsContent, RightsContentType } from "@/lib/models/rights-content";
import type { SupportOrganisation } from "@/lib/models/support-organisation";
import { resolveRelationshipIds } from "@/lib/content/relationship-ids";

/**
 * Content types that describe an actual legal right and therefore make a
 * legal claim — these require a governed (published, legal-review-complete)
 * legislation source and a public disclaimer before publish. The remainder
 * are informational/support content and do not. See the same classification
 * documented on `RIGHTS_CONTENT_TYPES` in lib/models/rights-content.ts.
 */
const LEGAL_CLAIM_CONTENT_TYPES: ReadonlySet<RightsContentType> = new Set([
  "rights_overview",
  "reporting_rights",
  "workplace_rights",
  "housing_rights",
  "privacy_rights",
  "discrimination_rights",
]);

export function contentTypeRequiresLegalSource(contentType: RightsContentType | undefined): boolean {
  if (!contentType) return true; // unset is treated as the stricter case until an admin actively chooses "other"/an informational type
  return LEGAL_CLAIM_CONTENT_TYPES.has(contentType);
}

export interface RightsContentEligibilityContext {
  resourceCategories: ResourceCategory[];
  documents: DocumentRecord[];
  supportOrganisations: SupportOrganisation[];
}

/**
 * Draft/Ready-for-review/Publish blockers for a Rights & Legal Information
 * record. Same non-retroactive-blocking reasoning as
 * lib/microcards/eligibility.ts applies to dangling-vs-archived relationships.
 */
export function getRightsContentBlockers(record: RightsContent, context: RightsContentEligibilityContext): string[] {
  const blockers: string[] = [];

  if (!record.title || record.title.trim().length === 0) blockers.push("Title is required.");
  if (!record.summary || record.summary.trim().length === 0) blockers.push("Short summary is required.");
  if (!record.body || record.body.trim().length === 0) blockers.push("Full content is required.");
  if (!record.contentType) blockers.push("Content type is required.");
  if (!record.jurisdiction) blockers.push("Jurisdiction is required.");
  if (!record.reviewDueDate || record.reviewDueDate.trim().length === 0) blockers.push("Review due date is required.");

  if (record.resourceCategoryIds.length === 0) {
    blockers.push("At least one resource category is required.");
  } else {
    const { danglingIds } = resolveRelationshipIds(record.resourceCategoryIds, context.resourceCategories);
    if (danglingIds.length > 0) blockers.push(`${danglingIds.length} resource category reference(s) no longer exist.`);
  }

  const { resolved: resolvedLegislation, danglingIds: danglingLegislationIds } = resolveRelationshipIds(
    record.relatedLegislationIds,
    context.documents
  );
  if (danglingLegislationIds.length > 0) {
    blockers.push(`${danglingLegislationIds.length} related legislation reference(s) no longer exist.`);
  }

  const { danglingIds: danglingOrgIds } = resolveRelationshipIds(
    record.relatedSupportOrganisationIds,
    context.supportOrganisations
  );
  if (danglingOrgIds.length > 0) {
    blockers.push(`${danglingOrgIds.length} related support organisation reference(s) no longer exist.`);
  }

  if (contentTypeRequiresLegalSource(record.contentType)) {
    const hasGovernedSource = resolvedLegislation.some(
      (r) => r.record.status === "published" && r.record.legalReviewComplete
    );
    if (!hasGovernedSource) {
      blockers.push(
        "This content type makes a legal claim and needs at least one related legislation source that is published and has legal review complete."
      );
    }
    if (!record.publicDisclaimer || record.publicDisclaimer.trim().length === 0) {
      blockers.push("A public disclaimer is required for content that makes a legal claim.");
    }
  }

  return blockers;
}
