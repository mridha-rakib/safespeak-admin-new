import { z } from "zod";

import { AUSTRALIAN_JURISDICTION_VALUES } from "@/lib/jurisdictions";
import { baseRecordSchema } from "@/lib/models/base";
import { contentPrioritySchema } from "@/lib/models/content-common";

/**
 * "_rights" / "discrimination_rights" / "privacy_rights" types describe an
 * actual legal right and therefore make a legal claim; the remainder are
 * informational/support content that does not. This split is the exact
 * classification `requiresLegalSource()` in lib/rights-content/eligibility.ts
 * uses to decide whether a governed legislation source is required before
 * publish — see that file for the full rule and its README cross-reference.
 */
export const RIGHTS_CONTENT_TYPES = [
  "rights_overview",
  "reporting_rights",
  "workplace_rights",
  "housing_rights",
  "privacy_rights",
  "discrimination_rights",
  "evidence_information",
  "support_access",
  "process_explanation",
  "other",
] as const;
export type RightsContentType = (typeof RIGHTS_CONTENT_TYPES)[number];

export const rightsContentSchema = baseRecordSchema.extend({
  title: z.string().min(1),
  /** UI label "Short summary" — the field the Phase 1 model already called `summary`. */
  summary: z.string().min(1),
  /** UI label "Full content" — already called `body`. */
  body: z.string().optional(),
  /** Same typed Australian jurisdiction list Knowledge & Legislation uses. Required for Ready for review / Publish. */
  jurisdiction: z.enum(AUSTRALIAN_JURISDICTION_VALUES).optional(),
  relatedLegislationIds: z.array(z.string()).default([]),
  incidentTypeIds: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),

  contentType: z.enum(RIGHTS_CONTENT_TYPES).optional(),
  /** At least one required for Ready for review / Publish — see eligibility. */
  resourceCategoryIds: z.array(z.string()).default([]),
  relatedSupportOrganisationIds: z.array(z.string()).default([]),
  priority: contentPrioritySchema.default("normal"),
  /** ISO date string. Required for Ready for review / Publish. */
  reviewDueDate: z.string().optional(),
  effectiveFromDate: z.string().optional(),
  /** Set automatically on first transition to "published" — never hand-edited. */
  publishedDate: z.string().optional(),
  sourceNotes: z.string().optional(),
  /** Required before publish for the legal-claim content types listed above. */
  publicDisclaimer: z.string().optional(),
  internalNotes: z.string().optional(),
});
export type RightsContent = z.infer<typeof rightsContentSchema>;
