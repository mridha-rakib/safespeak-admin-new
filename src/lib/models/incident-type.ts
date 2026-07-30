import { z } from "zod";

import { baseRecordSchema } from "@/lib/models/base";
import { taxonomyBaseFields } from "@/lib/models/taxonomy-base";

/**
 * `not_set` is the honest default — a default urgency is a starting
 * suggestion for triage, never a final decision. See lib/legislation-style
 * guidance in README "Incident Types."
 */
export const DEFAULT_URGENCY_LEVELS = ["not_set", "low", "medium", "high", "critical"] as const;
export type DefaultUrgencyLevel = (typeof DEFAULT_URGENCY_LEVELS)[number];

export const incidentTypeSchema = baseRecordSchema.extend({
  name: z.string().min(1),
  description: z.string().optional(),
  /** Legacy free-text grouping from Phase 1 — preserved for backward compatibility, not surfaced in the Phase 3 form. */
  category: z.string().optional(),
  ...taxonomyBaseFields,
  /** Fuller admin-facing guidance, distinct from the short `description`. */
  adminGuidance: z.string().optional(),
  defaultUrgency: z.enum(DEFAULT_URGENCY_LEVELS).default("not_set"),
  /** Optional wording shown to end users, when it needs to differ from the admin-facing `name`. */
  userFacingLabel: z.string().optional(),
  relatedResourceCategoryIds: z.array(z.string()).default([]),
});
export type IncidentType = z.infer<typeof incidentTypeSchema>;
