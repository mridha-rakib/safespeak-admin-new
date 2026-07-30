import { z } from "zod";

/**
 * Shared local-administrative verification status — used by both Support
 * Organisations and Support Professionals (Phase 5) so the concept, its
 * wording, and its display never drift between the two. This is never a
 * server-backed, regulatory, legal, or identity verification: it records
 * that a local administrator reviewed the record and formed a judgement,
 * nothing more. See README "Verification policy" for the full rule set.
 *
 * - `not_verified` — the default; no review has taken place.
 * - `verification_pending` — a review has started but not concluded.
 * - `verified` — a local administrator has recorded the record as verified.
 * - `verification_expired` — was verified, but the recorded verification
 *   review date has passed. Never set automatically by a background process
 *   — see `isVerificationExpired` below, which only ever *classifies* a
 *   date, and is called from the UI/summary layer, not from any write path.
 * - `verification_rejected` — a local administrator reviewed the record and
 *   explicitly did not confirm it.
 */
export const VERIFICATION_STATUSES = [
  "not_verified",
  "verification_pending",
  "verified",
  "verification_expired",
  "verification_rejected",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const verificationStatusSchema = z.enum(VERIFICATION_STATUSES);

export const VERIFICATION_STATUS_LABEL: Record<VerificationStatus, string> = {
  not_verified: "Not verified",
  verification_pending: "Verification pending",
  verified: "Verified (local administrative check)",
  verification_expired: "Verification expired",
  verification_rejected: "Verification not confirmed",
};

/**
 * Short, honest description of what each status actually means — surfaced
 * next to the status in the form so "Verified" is never read as an external
 * or regulatory guarantee. Never claim government, legal, or identity
 * verification: no such process exists in this application.
 */
export const VERIFICATION_STATUS_DESCRIPTION: Record<VerificationStatus, string> = {
  not_verified: "No local review has taken place yet.",
  verification_pending: "A local review has started but has not concluded.",
  verified: "A local administrator recorded this as verified after a local review. This is not a government, legal, or identity verification.",
  verification_expired: "This was previously verified, but the recorded verification review date has passed. The record has not been automatically changed.",
  verification_rejected: "A local administrator reviewed this and did not confirm it.",
};

/** Only `verified` reads as trustworthy — every other status is treated as "not currently verified" by callers that need a boolean. */
export function isCurrentlyVerified(status: VerificationStatus): boolean {
  return status === "verified";
}

/**
 * Pure date classification — never mutates a record and is never called
 * from a write path. `verification_expired` is a status the admin sets
 * explicitly (typically prompted by this function's result in the UI); nothing
 * in this codebase silently flips a record's stored status when a date passes.
 */
export function isVerificationExpired(verificationExpiryDate: string | undefined, referenceDate: Date = new Date()): boolean {
  if (!verificationExpiryDate || verificationExpiryDate.trim().length === 0) return false;
  const expiry = new Date(verificationExpiryDate);
  if (Number.isNaN(expiry.getTime())) return false;
  return expiry.getTime() < referenceDate.getTime();
}
