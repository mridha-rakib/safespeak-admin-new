import type { DocumentRecord } from "@/lib/models/document";
import type { Microcard } from "@/lib/models/microcard";
import type { ResourceCategory } from "@/lib/models/resource-category";
import type { RightsContent } from "@/lib/models/rights-content";
import type { SupportOrganisation } from "@/lib/models/support-organisation";
import { resolveRelationshipIds } from "@/lib/content/relationship-ids";

export interface MicrocardEligibilityContext {
  resourceCategories: ResourceCategory[];
  documents: DocumentRecord[];
  supportOrganisations: SupportOrganisation[];
  rightsContent: RightsContent[];
}

/**
 * Draft/Ready-for-review/Publish blockers for a Microcard. Called from the
 * form, the row-actions menu, and `transitionStatus`'s publish guard alike
 * so the rule can never drift between them — see README "Publishing rules."
 *
 * Deliberately does not block on a *dangling* Resource Category alone
 * turning "archived after the fact" — see the same reasoning already
 * established for taxonomy's own publish guard: content that was valid when
 * last saved should not spontaneously become unpublishable because of an
 * unrelated later change elsewhere. A relationship that no longer resolves
 * to any record at all (a true dangling reference) still blocks, since that
 * is never a legitimate state. "No new relationship to an archived record"
 * is enforced by excluding archived options from the selector itself, not
 * here.
 */
export function getMicrocardBlockers(record: Microcard, context: MicrocardEligibilityContext): string[] {
  const blockers: string[] = [];

  if (!record.title || record.title.trim().length === 0) blockers.push("Title is required.");
  if (!record.summary || record.summary.trim().length === 0) blockers.push("Short guidance is required.");
  if (!record.body || record.body.trim().length === 0) blockers.push("Full content is required.");
  if (!record.cardType) blockers.push("Card type is required.");
  if (!record.jurisdiction) blockers.push("Jurisdiction is required.");
  if (!record.reviewDueDate || record.reviewDueDate.trim().length === 0) blockers.push("Review due date is required.");
  if (!Number.isInteger(record.displayOrder) || record.displayOrder < 0) {
    blockers.push("Display order must be zero or a positive whole number.");
  }

  if (!record.resourceCategoryId) {
    blockers.push("A resource category is required.");
  } else {
    const { danglingIds } = resolveRelationshipIds([record.resourceCategoryId], context.resourceCategories);
    if (danglingIds.length > 0) blockers.push("The selected resource category no longer exists.");
  }

  const { danglingIds: danglingLegislationIds } = resolveRelationshipIds(record.relatedLegislationIds, context.documents);
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

  if (record.cta.type !== "none" && record.cta.type !== "start_report") {
    const target = record.cta.target;
    if (!target) {
      blockers.push("The call-to-action needs a target.");
    } else if (record.cta.type === "view_rights_information") {
      if (!context.rightsContent.some((r) => r.id === target)) {
        blockers.push("The call-to-action's Rights & Legal Information target no longer exists.");
      }
    } else if (record.cta.type === "view_legislation_source") {
      if (!context.documents.some((d) => d.id === target)) {
        blockers.push("The call-to-action's legislation source no longer exists.");
      }
    } else if (record.cta.type === "view_support_service") {
      if (!context.supportOrganisations.some((o) => o.id === target)) {
        blockers.push("The call-to-action's support service no longer exists.");
      }
    }
    // open_internal_route / open_safe_external_link shape validity is already enforced by microcardCtaSchema.
  }

  return blockers;
}
