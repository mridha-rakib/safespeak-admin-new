import { z } from "zod";

import { baseRecordSchema } from "@/lib/models/base";

export const TRIAGE_URGENCY_LEVELS = ["low", "moderate", "high", "critical"] as const;
export type TriageUrgencyLevel = (typeof TRIAGE_URGENCY_LEVELS)[number];

export const triageLabelSchema = baseRecordSchema.extend({
  name: z.string().min(1),
  description: z.string().optional(),
  urgencyLevel: z.enum(TRIAGE_URGENCY_LEVELS).default("moderate"),
});
export type TriageLabel = z.infer<typeof triageLabelSchema>;
