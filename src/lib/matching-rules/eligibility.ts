import { resolveRelationshipIds, isSelectableForNewRelationship } from "@/lib/content/relationship-ids";
import type { DocumentRecord } from "@/lib/models/document";
import { MATCHING_RULE_RECOMMENDATION_FIELDS, type MatchingRule } from "@/lib/models/matching-rule";
import type { Microcard } from "@/lib/models/microcard";
import type { IncidentType } from "@/lib/models/incident-type";
import type { ReportingDestination } from "@/lib/models/reporting-destination";
import type { ResourceCategory } from "@/lib/models/resource-category";
import type { RightsContent } from "@/lib/models/rights-content";
import type { SupportOrganisation } from "@/lib/models/support-organisation";
import type { SupportProfessional } from "@/lib/models/support-professional";
import { isValidMachineKey, MACHINE_KEY_HELP_TEXT } from "@/lib/taxonomy/machine-key";
import type { TriageLabel } from "@/lib/models/triage-label";

export interface MatchingRuleEligibilityContext {
  incidentTypes: IncidentType[];
  triageLabels: TriageLabel[];
  resourceCategories: ResourceCategory[];
  microcards: Microcard[];
  rightsContent: RightsContent[];
  supportOrganisations: SupportOrganisation[];
  supportProfessionals: SupportProfessional[];
  reportingDestinations: ReportingDestination[];
  /** Legislation — the domain's own record type is `DocumentRecord`, referenced by `MatchingRule.legislationIds`. */
  documents: DocumentRecord[];
}

/**
 * Draft/Ready-for-review/Publish blockers for a Matching Rule — Phase 6
 * spec §11. Deliberately stricter than every other domain's eligibility
 * module in one respect: a *recommendation* reference (microcard, rights
 * content, organisation, professional, reporting destination, legislation
 * source) must resolve to a currently-`published` record, not merely an
 * existing one. Microcards/Rights Content allow an existing-but-unpublished
 * relationship to stand (content "valid when last saved" should not
 * spontaneously break), but a Matching Rule that recommends unpublished
 * content is actively wrong the moment it runs — the frontend would surface
 * a recommendation nobody can see — so this check re-applies to every
 * existing selection on every eligibility check, with no "already selected,
 * so it's grandfathered in" leniency. *Condition* references (incident
 * type/triage label/resource category ids) keep the usual convention: only a
 * true dangling (nonexistent) id blocks, an existing draft/archived one does
 * not.
 */
export function getMatchingRuleBlockers(record: MatchingRule, context: MatchingRuleEligibilityContext): string[] {
  const blockers: string[] = [];

  if (!record.name || record.name.trim().length === 0) blockers.push("Name is required.");
  if (!record.machineKey || !isValidMachineKey(record.machineKey)) {
    blockers.push(`A valid stable key is required. ${MACHINE_KEY_HELP_TEXT}`);
  }
  if (!record.description || record.description.trim().length === 0) blockers.push("Description is required.");
  if (!Number.isInteger(record.priority)) blockers.push("Priority must be a whole number.");
  if (!record.reviewDueDate || record.reviewDueDate.trim().length === 0) blockers.push("Review due date is required.");

  const hasCondition =
    record.topicKeys.length > 0 ||
    record.incidentTypeIds.length > 0 ||
    record.triageLabelIds.length > 0 ||
    record.resourceCategoryIds.length > 0 ||
    record.jurisdictions.length > 0 ||
    record.urgencyLevels.length > 0 ||
    record.supportNeeds.length > 0;
  if (!hasCondition) {
    blockers.push(
      "At least one match condition (topic, incident type, triage label, resource category, jurisdiction, urgency, or support need) is required."
    );
  }

  const hasRecommendation = MATCHING_RULE_RECOMMENDATION_FIELDS.some((field) => record[field].length > 0);
  if (!hasRecommendation) {
    blockers.push(
      "At least one recommendation (microcard, rights content, organisation, professional, reporting destination, or legislation source) is required."
    );
  }

  const conditionChecks: { ids: string[]; records: { id: string }[]; label: string }[] = [
    { ids: record.incidentTypeIds, records: context.incidentTypes, label: "incident type" },
    { ids: record.triageLabelIds, records: context.triageLabels, label: "triage label" },
    { ids: record.resourceCategoryIds, records: context.resourceCategories, label: "resource category" },
  ];
  for (const { ids, records, label } of conditionChecks) {
    const dangling = ids.filter((id) => !records.some((r) => r.id === id));
    if (dangling.length > 0) {
      blockers.push(`${dangling.length} ${label} condition reference(s) no longer exist.`);
    }
  }

  const recommendationChecks: {
    ids: string[];
    records: { id: string; status: MatchingRule["status"] }[];
    label: string;
  }[] = [
    { ids: record.microcardIds, records: context.microcards, label: "microcard" },
    { ids: record.rightsContentIds, records: context.rightsContent, label: "rights content" },
    { ids: record.supportOrganisationIds, records: context.supportOrganisations, label: "organisation" },
    { ids: record.supportProfessionalIds, records: context.supportProfessionals, label: "professional" },
    { ids: record.reportingDestinationIds, records: context.reportingDestinations, label: "reporting destination" },
    { ids: record.legislationIds, records: context.documents, label: "legislation source" },
  ];
  for (const { ids, records, label } of recommendationChecks) {
    const { resolved, danglingIds } = resolveRelationshipIds(ids, records);
    if (danglingIds.length > 0) {
      blockers.push(`${danglingIds.length} recommended ${label}(s) no longer exist.`);
    }
    const unpublished = resolved.filter((r) => !isSelectableForNewRelationship(r.record.status));
    if (unpublished.length > 0) {
      blockers.push(`${unpublished.length} recommended ${label}(s) are not published and cannot be used in a live matching rule.`);
    }
  }

  return blockers;
}
