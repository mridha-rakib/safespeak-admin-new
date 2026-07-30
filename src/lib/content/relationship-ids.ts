import type { ContentStatus } from "@/lib/models/base";

/**
 * The one shared "resolve a stored id array against the records that
 * actually exist" primitive, reused by every relationship kind Microcards
 * and Rights Content can have (taxonomy, legislation, support organisation).
 * Each domain's own eligibility/selector code decides what to *do* with the
 * result (which statuses block a new selection, which only warrant a
 * warning on an existing reference) — those policies genuinely differ per
 * relationship kind (see lib/microcards/eligibility.ts and
 * lib/rights-content/eligibility.ts), so they are not baked in here.
 */
export interface ResolvedRelationship<T extends { id: string; status: ContentStatus }> {
  id: string;
  record: T;
}

export interface RelationshipResolution<T extends { id: string; status: ContentStatus }> {
  resolved: ResolvedRelationship<T>[];
  /** Ids in the input array that don't match any current record — never invented, always surfaced. */
  danglingIds: string[];
}

export function resolveRelationshipIds<T extends { id: string; status: ContentStatus }>(
  ids: string[],
  records: T[]
): RelationshipResolution<T> {
  const byId = new Map(records.map((r) => [r.id, r]));
  const resolved: ResolvedRelationship<T>[] = [];
  const danglingIds: string[] = [];
  for (const id of ids) {
    const record = byId.get(id);
    if (record) resolved.push({ id, record });
    else danglingIds.push(id);
  }
  return { resolved, danglingIds };
}

/** Non-archived, non-draft, non-needs_update — the "safe to offer as a brand-new selection" set used across every relationship selector in this app. */
export function isSelectableForNewRelationship(status: ContentStatus): boolean {
  return status === "published";
}

/**
 * The singular-reference counterpart to `resolveRelationshipIds` — for
 * fields like `SupportProfessional.organisationId` /
 * `ReportingDestination.organisationId` that reference at most one record.
 * Added in Phase 5 rather than making every singular-reference call site
 * wrap its id in a one-element array.
 */
export function resolveSingularRelationshipId<T extends { id: string; status: ContentStatus }>(
  id: string | undefined,
  records: T[]
): { record: T | undefined; isDangling: boolean } {
  if (!id) return { record: undefined, isDangling: false };
  const record = records.find((r) => r.id === id);
  return { record, isDangling: record === undefined };
}
