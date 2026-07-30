import { z } from "zod";

import { AUSTRALIAN_JURISDICTION_VALUES } from "@/lib/jurisdictions";
import { assistantTopicKeySchema } from "@/lib/models/assistant-topic";
import { baseRecordSchema } from "@/lib/models/base";
import { TRIAGE_URGENCY_LEVELS } from "@/lib/models/triage-label";

/**
 * How incident context (assistant topic, incident type, triage labels,
 * jurisdiction, urgency, support needs) connects to the content and support
 * that should surface on the frontend Triage page. Phase 6: full CRUD +
 * eligibility + deterministic mock matching engine — see
 * docs/ARCHITECTURE.md "Phase 6 — Matching Rules."
 *
 * `machineKey` reuses the same stable-key policy as Incident Types/Triage
 * Labels/Resource Categories (lib/taxonomy/machine-key.ts) even though
 * Matching Rules aren't a `TaxonomyKind` — the key is still a permanent,
 * human-readable identity a future integration could reference.
 *
 * All condition arrays (`topicKeys`, `incidentTypeIds`, `triageLabelIds`,
 * `resourceCategoryIds`, `jurisdictions`, `urgencyLevels`, `supportNeeds`) are
 * empty-by-default *wildcards*: an empty array means "no filter on this
 * dimension," not "matches nothing." A rule with every condition empty still
 * requires `enabled` + at least one recommendation to ever execute — see
 * lib/matching-rules/eligibility.ts and lib/matching-rules/engine.ts.
 *
 * `supportNeeds` is deliberately a free-text tag array (mirrors the existing
 * `tags`/`audienceGroups`/`servicesOffered` convention elsewhere) rather than
 * a new governed enum — there is no dedicated "support need" taxonomy entity
 * in this repository to ground one. This is distinct from a Triage Label
 * whose `labelGroup` is `"support_need"` (a governed, reviewable indicator);
 * `supportNeeds` here is a lightweight matching hint only.
 */
export const matchingRuleSchema = baseRecordSchema.extend({
  name: z.string().min(1),
  machineKey: z.string().min(1),
  description: z.string().optional(),
  priority: z.number().int().default(0),
  enabled: z.boolean().default(true),

  topicKeys: z.array(assistantTopicKeySchema).default([]),
  incidentTypeIds: z.array(z.string()).default([]),
  triageLabelIds: z.array(z.string()).default([]),
  resourceCategoryIds: z.array(z.string()).default([]),
  /** Typed Australian jurisdiction codes — see lib/jurisdictions.ts. Empty array = matches any jurisdiction (rule itself is jurisdiction-agnostic, distinct from a content record's own `australiaWide` flag). */
  jurisdictions: z.array(z.enum(AUSTRALIAN_JURISDICTION_VALUES)).default([]),
  urgencyLevels: z.array(z.enum(TRIAGE_URGENCY_LEVELS)).default([]),
  supportNeeds: z.array(z.string()).default([]),

  legislationIds: z.array(z.string()).default([]),
  microcardIds: z.array(z.string()).default([]),
  rightsContentIds: z.array(z.string()).default([]),
  supportOrganisationIds: z.array(z.string()).default([]),
  supportProfessionalIds: z.array(z.string()).default([]),
  reportingDestinationIds: z.array(z.string()).default([]),

  /** Required for Ready for review / Publish — see lib/matching-rules/eligibility.ts. */
  reviewDueDate: z.string().optional(),
  /** Admin-only — never shown in a public preview or the Published Content Bundle. */
  internalNotes: z.string().optional(),
  /** Set automatically on first transition to "published" — never hand-edited. */
  publishedDate: z.string().optional(),
});
export type MatchingRule = z.infer<typeof matchingRuleSchema>;

/** Recommendation-ID fields on a MatchingRule, grouped for the matching engine and eligibility checks. */
export const MATCHING_RULE_RECOMMENDATION_FIELDS = [
  "microcardIds",
  "rightsContentIds",
  "supportOrganisationIds",
  "supportProfessionalIds",
  "reportingDestinationIds",
  "legislationIds",
] as const;
