import { z } from "zod";

import { baseRecordSchema } from "@/lib/models/base";
import { taxonomyBaseFields } from "@/lib/models/taxonomy-base";

export const TRIAGE_URGENCY_LEVELS = ["low", "moderate", "high", "critical"] as const;
export type TriageUrgencyLevel = (typeof TRIAGE_URGENCY_LEVELS)[number];

/**
 * What KIND of label this is — orthogonal to `urgencyLevel` (how severe).
 * "context_indicator"/"bias_indicator" are deliberately worded as
 * indicators: a label never represents a confirmed hate crime, legal
 * finding, diagnosis, or final decision — see README "Triage Labels."
 */
export const LABEL_GROUPS = [
  "safety",
  "urgency",
  "context_indicator",
  "bias_indicator",
  "support_need",
  "accessibility_need",
  "other",
] as const;
export type LabelGroup = (typeof LABEL_GROUPS)[number];

export const triageLabelSchema = baseRecordSchema.extend({
  name: z.string().min(1),
  description: z.string().optional(),
  urgencyLevel: z.enum(TRIAGE_URGENCY_LEVELS).default("moderate"),
  ...taxonomyBaseFields,
  labelGroup: z.enum(LABEL_GROUPS).default("other"),
});
export type TriageLabel = z.infer<typeof triageLabelSchema>;
