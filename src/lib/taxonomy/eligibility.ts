import { isValidMachineKey } from "@/lib/taxonomy/machine-key";
import { isDuplicateMachineKey, isValidDisplayOrder, type TaxonomyLike } from "@/lib/taxonomy/validation";
import type { IncidentType } from "@/lib/models/incident-type";
import type { ResourceCategory } from "@/lib/models/resource-category";
import type { TriageLabel } from "@/lib/models/triage-label";

/**
 * Ready-for-review / publish blockers for the three taxonomy entities.
 * Drafts may be incomplete; everything below only gates the *next* status.
 * Shared by the forms, the row-actions menu, and the repository's
 * `transitionStatus` guard so the rule can't drift between them.
 */
function commonBlockers<T extends TaxonomyLike>(record: T, existing: T[]): string[] {
  const blockers: string[] = [];
  if (!record.name || record.name.trim().length === 0) blockers.push("Name is required.");
  if (!record.machineKey || !isValidMachineKey(record.machineKey)) {
    blockers.push("A valid stable key is required (lowercase letters, numbers, and single underscores, starting with a letter).");
  } else if (isDuplicateMachineKey(record.machineKey, existing, record.id)) {
    blockers.push("This stable key is already used by another record.");
  }
  return blockers;
}

export function getIncidentTypeBlockers(record: IncidentType, existing: IncidentType[]): string[] {
  const blockers = commonBlockers(record, existing);
  if (!record.description || record.description.trim().length === 0) blockers.push("A short description is required.");
  if (!isValidDisplayOrder(record.displayOrder)) blockers.push("Display order must be zero or a positive whole number.");
  return blockers;
}

export function getTriageLabelBlockers(record: TriageLabel, existing: TriageLabel[]): string[] {
  const blockers = commonBlockers(record, existing);
  if (!record.description || record.description.trim().length === 0) blockers.push("A short description is required.");
  if (!record.labelGroup) blockers.push("A label group is required.");
  if (!isValidDisplayOrder(record.displayOrder)) blockers.push("Display order must be zero or a positive whole number.");
  return blockers;
}

export function getResourceCategoryBlockers(record: ResourceCategory, existing: ResourceCategory[]): string[] {
  const blockers = commonBlockers(record, existing);
  if (!record.description || record.description.trim().length === 0) blockers.push("A short description is required.");
  if (!isValidDisplayOrder(record.displayOrder)) blockers.push("Display order must be zero or a positive whole number.");
  return blockers;
}
