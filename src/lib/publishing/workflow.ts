import type { ContentStatus } from "@/lib/models/base";

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

export function legislationPublishGuard(legalReviewComplete: boolean) {
  return (
    _from: ContentStatus,
    to: ContentStatus
  ): { allowed: boolean; reason?: string } => {
    if (to === "published" && !legalReviewComplete) {
      return {
        allowed: false,
        reason:
          "This document needs a completed legal/governance review before it can be published.",
      };
    }
    return { allowed: true };
  };
}

/**
 * Advocates and counsellors may publish while unverified — the guard always
 * allows it, but the caller is responsible for keeping the "Not verified"
 * warning attached to the published profile.
 */
export function supportProfessionalPublishGuard() {
  return (): { allowed: boolean; reason?: string } => ({ allowed: true });
}
