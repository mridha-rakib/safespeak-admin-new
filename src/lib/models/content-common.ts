import { z } from "zod";

/**
 * Shared across Microcards and Rights & Legal Information — the one place
 * this enum is defined so it isn't duplicated per model. Deliberately not
 * the same enum as `DOCUMENT_PRIORITIES` (low/medium/high, in
 * lib/models/document.ts): that one is specific to Knowledge & Legislation
 * source documents, has no "critical" tier, and predates this phase's
 * explicit requirement for one here. "Critical" is a distribution/attention
 * priority only — see the wording rule in lib/microcards/eligibility.ts and
 * lib/rights-content/eligibility.ts: it must never be presented as an
 * emergency determination.
 */
export const CONTENT_PRIORITIES = ["low", "normal", "high", "critical"] as const;
export type ContentPriority = (typeof CONTENT_PRIORITIES)[number];
export const contentPrioritySchema = z.enum(CONTENT_PRIORITIES);

export const CONTENT_PRIORITY_LABEL: Record<ContentPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  critical: "Critical",
};
