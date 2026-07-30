import { resolveRelationshipIds, resolveSingularRelationshipId } from "@/lib/content/relationship-ids";
import type { ResourceCategory } from "@/lib/models/resource-category";
import type { SupportOrganisation } from "@/lib/models/support-organisation";
import type { SupportProfessional } from "@/lib/models/support-professional";
import { deriveProfessionalContactCapabilities } from "@/lib/support-directory/contact";

export interface ProfessionalEligibilityContext {
  resourceCategories: ResourceCategory[];
  supportOrganisations: SupportOrganisation[];
}

/**
 * Draft/Ready-for-review/Publish blockers for an Advocate/Counsellor.
 * Verification status is deliberately never checked here — a Not Verified
 * professional may publish; see README "Verification policy." A missing
 * `organisationId` never blocks (a professional may be independent), but a
 * *dangling* one (set, but no longer resolving to any organisation) does.
 */
export function getProfessionalBlockers(record: SupportProfessional, context: ProfessionalEligibilityContext): string[] {
  const blockers: string[] = [];

  if (!record.fullName || record.fullName.trim().length === 0) blockers.push("Full name is required.");
  if (!record.shortIntroduction || record.shortIntroduction.trim().length === 0) blockers.push("Short summary is required.");
  if (!record.fullBiography || record.fullBiography.trim().length === 0) blockers.push("Biography or service description is required.");

  if (record.resourceCategoryIds.length === 0 && record.specialisations.length === 0) {
    blockers.push("At least one resource category or specialisation is required.");
  } else if (record.resourceCategoryIds.length > 0) {
    const { danglingIds } = resolveRelationshipIds(record.resourceCategoryIds, context.resourceCategories);
    if (danglingIds.length > 0) blockers.push(`${danglingIds.length} resource category reference(s) no longer exist.`);
  }

  if (!record.australiaWide && record.jurisdictions.length === 0) {
    blockers.push("At least one jurisdiction is required, or mark this professional as Australia-wide.");
  }

  const { isDangling: hasDanglingOrganisation } = resolveSingularRelationshipId(record.organisationId, context.supportOrganisations);
  if (hasDanglingOrganisation) blockers.push("The linked organisation no longer exists.");

  const capabilities = deriveProfessionalContactCapabilities(record);
  const hasDirectContact = capabilities.canCall || capabilities.canEmail || capabilities.canBook || capabilities.canVisitWebsite;
  const hasOrganisationReferral = Boolean(record.organisationId) && !hasDanglingOrganisation;
  if (!hasDirectContact && !hasOrganisationReferral) {
    blockers.push("At least one direct contact method, or a linked organisation to refer through, is required.");
  }

  if (!record.nextReviewDate || record.nextReviewDate.trim().length === 0) blockers.push("Review due date is required.");

  return blockers;
}
