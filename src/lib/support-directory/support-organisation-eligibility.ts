import { resolveRelationshipIds } from "@/lib/content/relationship-ids";
import type { ResourceCategory } from "@/lib/models/resource-category";
import type { SupportOrganisation } from "@/lib/models/support-organisation";
import { deriveOrganisationContactCapabilities } from "@/lib/support-directory/contact";

export interface SupportOrganisationEligibilityContext {
  resourceCategories: ResourceCategory[];
}

/**
 * Draft/Ready-for-review/Publish blockers for a Support Organisation.
 * Verification status is deliberately never checked here — a Not Verified
 * organisation may publish; see README "Verification policy." Reused by the
 * form, the row-actions menu, the Review Queue, and `transitionStatus`'s
 * publish guard, so the rule can never drift between them.
 */
export function getSupportOrganisationBlockers(
  record: SupportOrganisation,
  context: SupportOrganisationEligibilityContext
): string[] {
  const blockers: string[] = [];

  if (!record.name || record.name.trim().length === 0) blockers.push("Organisation name is required.");
  if (!record.organisationType) blockers.push("Organisation type is required.");
  if (!record.shortDescription || record.shortDescription.trim().length === 0) blockers.push("Short description is required.");
  if (!record.fullDescription || record.fullDescription.trim().length === 0) blockers.push("Full service description is required.");

  if (record.resourceCategoryIds.length === 0) {
    blockers.push("At least one resource category is required.");
  } else {
    const { danglingIds } = resolveRelationshipIds(record.resourceCategoryIds, context.resourceCategories);
    if (danglingIds.length > 0) blockers.push(`${danglingIds.length} resource category reference(s) no longer exist.`);
  }

  if (!record.australiaWide && record.jurisdictions.length === 0) {
    blockers.push("At least one jurisdiction is required, or mark this organisation as Australia-wide.");
  }

  const capabilities = deriveOrganisationContactCapabilities(record);
  const hasAnyContact = capabilities.canCall || capabilities.canEmail || capabilities.canVisitWebsite || capabilities.canBook || capabilities.canRefer;
  if (!hasAnyContact) blockers.push("At least one valid contact channel (phone, email, website, booking, or referral link) is required.");

  if (!record.reviewDueDate || record.reviewDueDate.trim().length === 0) blockers.push("Review due date is required.");

  return blockers;
}
