import { z } from "zod";

import { AUSTRALIAN_JURISDICTION_VALUES } from "@/lib/jurisdictions";
import { baseRecordSchema } from "@/lib/models/base";
import { contentPrioritySchema } from "@/lib/models/content-common";
import { microcardCtaSchema } from "@/lib/models/microcard-cta";

/**
 * Short, plain-language educational card type — deliberately distinct from
 * `topic` (a free-text legacy Phase 1 descriptor, preserved below) and from
 * Triage Label's `labelGroup` (a different taxonomy concept entirely).
 */
export const MICROCARD_CARD_TYPES = [
  "quick_guidance",
  "safety_tip",
  "rights_summary",
  "next_step",
  "evidence_tip",
  "support_option",
  "preparation_tip",
  "other",
] as const;
export type MicrocardCardType = (typeof MICROCARD_CARD_TYPES)[number];

export const microcardSchema = baseRecordSchema.extend({
  title: z.string().min(1),
  /** UI label "Short guidance" — same field the Phase 1 model already called `summary`, not duplicated under a second name. */
  summary: z.string().min(1),
  /** UI label "Full content" — same field already called `body`. */
  body: z.string().optional(),
  /** Legacy free-text descriptor, kept optional and lightly exposed (mirrors DocumentRecord.topic) — not the same concept as `cardType`. */
  topic: z.string().optional(),
  tags: z.array(z.string()).default([]),
  /** Optional: only meaningful "where the content is incident-specific" (spec wording) — a per-record editorial judgement this schema cannot determine, so it is never required for publish. */
  incidentTypeIds: z.array(z.string()).default([]),

  cardType: z.enum(MICROCARD_CARD_TYPES).optional(),
  /** Single primary category (spec: "Resource Category", singular) — required for Ready for review / Publish, enforced in lib/microcards/eligibility.ts, not here. */
  resourceCategoryId: z.string().optional(),
  /** Same typed Australian jurisdiction list Knowledge & Legislation uses — content here can be jurisdiction-specific in the same way. */
  jurisdiction: z.enum(AUSTRALIAN_JURISDICTION_VALUES).optional(),
  priority: contentPrioritySchema.default("normal"),
  displayOrder: z.number().int().nonnegative().default(0),
  /** ISO date string. Required for Ready for review / Publish — see eligibility. */
  reviewDueDate: z.string().optional(),

  relatedLegislationIds: z.array(z.string()).default([]),
  relatedSupportOrganisationIds: z.array(z.string()).default([]),
  cta: microcardCtaSchema.default({ type: "none" }),

  /** Set automatically on first transition to "published" — never hand-edited. */
  publishedDate: z.string().optional(),
  internalNotes: z.string().optional(),
});
export type Microcard = z.infer<typeof microcardSchema>;
