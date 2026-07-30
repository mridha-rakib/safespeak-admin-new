import { resolveRelationshipIds, resolveSingularRelationshipId } from "@/lib/content/relationship-ids";
import type { ReportingDestination } from "@/lib/models/reporting-destination";
import type { ResourceCategory } from "@/lib/models/resource-category";
import type { SupportOrganisation } from "@/lib/models/support-organisation";
import { REPORTING_METHOD_LABEL } from "@/lib/models/reporting-destination-type";
import { getUnsupportedReportingMethods } from "@/lib/support-directory/reporting-method";

export interface DestinationEligibilityContext {
  resourceCategories: ResourceCategory[];
  supportOrganisations: SupportOrganisation[];
}

/**
 * Draft/Ready-for-review/Publish blockers for a Reporting Destination.
 * "Incident scope" is satisfied either by at least one Incident Type or by
 * leaving the list empty *and* the description making clear the scope is
 * general — since that editorial judgement can't be validated by a schema,
 * an empty `incidentTypeIds` array is never itself a blocker (this mirrors
 * Microcard's `incidentTypeIds` policy — see lib/microcards/eligibility.ts).
 */
export function getDestinationBlockers(record: ReportingDestination, context: DestinationEligibilityContext): string[] {
  const blockers: string[] = [];

  if (!record.name || record.name.trim().length === 0) blockers.push("Destination name is required.");
  if (!record.destinationType) blockers.push("Destination type is required.");
  if (!record.description || record.description.trim().length === 0) blockers.push("Short description is required.");

  if (!record.australiaWide && record.jurisdictions.length === 0) {
    blockers.push("At least one jurisdiction is required, or mark this destination as Australia-wide.");
  }

  if (record.resourceCategoryIds.length > 0) {
    const { danglingIds } = resolveRelationshipIds(record.resourceCategoryIds, context.resourceCategories);
    if (danglingIds.length > 0) blockers.push(`${danglingIds.length} resource category reference(s) no longer exist.`);
  }

  const { isDangling: hasDanglingOrganisation } = resolveSingularRelationshipId(record.organisationId, context.supportOrganisations);
  if (hasDanglingOrganisation) blockers.push("The linked organisation no longer exists.");

  if (record.reportingMethods.length === 0) {
    blockers.push("At least one reporting method is required.");
  } else {
    const unsupported = getUnsupportedReportingMethods(record);
    for (const method of unsupported) {
      blockers.push(`"${REPORTING_METHOD_LABEL[method]}" is selected as a reporting method but its required contact information is missing.`);
    }
  }

  if (!record.reportingInstructions || record.reportingInstructions.trim().length === 0) {
    blockers.push("Clear reporting instructions are required.");
  }

  if (!record.reviewDueDate || record.reviewDueDate.trim().length === 0) blockers.push("Review due date is required.");

  return blockers;
}
