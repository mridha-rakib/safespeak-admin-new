import { getPublicationBlockers } from "@/lib/legislation/readiness";
import type { ContentStatus } from "@/lib/models/base";
import type { DocumentRecord } from "@/lib/models/document";

/**
 * Shared status graph for every content domain. Domain-specific extra
 * requirements (e.g. legislation's legal-review gate) are layered on top via
 * the `guard` passed to `canTransitionStatus` — they do not change the graph
 * itself, so every domain keeps the same vocabulary of states.
 */
const ALLOWED_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  draft: ["ready_for_review", "archived"],
  ready_for_review: ["published", "draft", "archived"],
  published: ["needs_update", "archived"],
  needs_update: ["ready_for_review", "draft", "archived"],
  archived: ["draft"],
};

export function isValidStatusTransition(from: ContentStatus, to: ContentStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Applies one universal transition graph, but allows a domain to veto a
 * specific transition (e.g. "legislation cannot publish without legal
 * review"). Do not use one hard-coded publication rule for every domain —
 * pass the domain's own guard instead of special-casing here.
 */
export function canTransitionStatus(
  from: ContentStatus,
  to: ContentStatus,
  guard?: (from: ContentStatus, to: ContentStatus) => { allowed: boolean; reason?: string }
): { allowed: boolean; reason?: string } {
  if (!isValidStatusTransition(from, to)) {
    return { allowed: false, reason: `Cannot move from "${from}" to "${to}".` };
  }
  return guard ? guard(from, to) : { allowed: true };
}

/**
 * Delegates to lib/legislation/readiness.ts (getPublicationBlockers) rather
 * than re-implementing the publish rule here, so the status-graph guard and
 * the detail-page/form checklist can never drift apart.
 */
export function legislationPublishGuard(doc: DocumentRecord) {
  return (
    _from: ContentStatus,
    to: ContentStatus
  ): { allowed: boolean; reason?: string } => {
    if (to !== "published") return { allowed: true };
    const blockers = getPublicationBlockers(doc);
    if (blockers.length > 0) {
      return { allowed: false, reason: blockers[0] };
    }
    return { allowed: true };
  };
}

/**
 * Shared by Incident Types, Triage Labels, Resource Categories, Microcards,
 * Rights & Legal Information, Support Organisations, Advocates &
 * Counsellors, and Reporting Destinations — the name predates everything
 * past taxonomy, but the logic was already fully generic (it only ever
 * needed a precomputed blocker list, never a raw record), so every later
 * phase reuses it as-is rather than duplicating it under a second name.
 * Each domain's own eligibility module (lib/taxonomy/eligibility.ts,
 * lib/microcards/eligibility.ts, lib/rights-content/eligibility.ts,
 * lib/support-directory/*-eligibility.ts) computes that blocker list, since
 * each needs different cross-domain data this guard has no access to. None
 * of the Support Directory blocker functions ever inspect
 * `verificationStatus` — that is how "a record may publish while
 * unverified" is actually enforced (an empty blocker list, not a
 * verification-aware guard); the caller is responsible for keeping the
 * "Not verified" / "Publication does not imply verification" warning
 * attached wherever the published record is shown.
 */
export function taxonomyPublishGuard(blockers: string[]) {
  return (_from: ContentStatus, to: ContentStatus): { allowed: boolean; reason?: string } => {
    if (to !== "published" && to !== "ready_for_review") return { allowed: true };
    if (blockers.length > 0) return { allowed: false, reason: blockers[0] };
    return { allowed: true };
  };
}
