import { z } from "zod";

import { baseRecordSchema } from "@/lib/models/base";
import { TRIAGE_URGENCY_LEVELS } from "@/lib/models/triage-label";

/**
 * Data contract + demo records only in this phase — no rule-builder UI or
 * matching engine. A rule expresses a relationship between an incident
 * context and the content/support that should surface for it.
 */
export const matchingRuleSchema = baseRecordSchema.extend({
  name: z.string().min(1),
  incidentTypeId: z.string().optional(),
  jurisdictions: z.array(z.string()).default([]),
  urgencyLevels: z.array(z.enum(TRIAGE_URGENCY_LEVELS)).default([]),
  triageLabelIds: z.array(z.string()).default([]),
  legislationIds: z.array(z.string()).default([]),
  microcardIds: z.array(z.string()).default([]),
  rightsContentIds: z.array(z.string()).default([]),
  supportOrganisationIds: z.array(z.string()).default([]),
  supportProfessionalIds: z.array(z.string()).default([]),
  reportingDestinationIds: z.array(z.string()).default([]),
  priority: z.number().int().default(0),
  required: z.boolean().default(false),
  active: z.boolean().default(true),
  internalMatchReason: z.string().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
});
export type MatchingRule = z.infer<typeof matchingRuleSchema>;
