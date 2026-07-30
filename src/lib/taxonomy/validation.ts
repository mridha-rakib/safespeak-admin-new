/** Shared duplicate/completeness checks used by taxonomy forms, repository writes, and tests alike. */

export interface TaxonomyLike {
  id: string;
  name: string;
  machineKey: string;
  status: string;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isDuplicateMachineKey<T extends TaxonomyLike>(key: string, existing: T[], excludeId?: string): boolean {
  const normalized = key.trim().toLowerCase();
  return existing.some((record) => record.id !== excludeId && record.machineKey.toLowerCase() === normalized);
}

export function isDuplicateDisplayName<T extends TaxonomyLike>(name: string, existing: T[], excludeId?: string): boolean {
  const normalized = normalizeName(name);
  if (!normalized) return false;
  return existing.some((record) => record.id !== excludeId && normalizeName(record.name) === normalized);
}

export function isValidDisplayOrder(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}
