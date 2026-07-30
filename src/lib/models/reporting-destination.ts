import { z } from "zod";

import { AUSTRALIAN_JURISDICTION_VALUES } from "@/lib/jurisdictions";
import { baseRecordSchema } from "@/lib/models/base";
import { DESTINATION_TYPES, REPORTING_METHODS, TRISTATE_VALUES } from "@/lib/models/reporting-destination-type";
import { emailFieldSchema, phoneFieldSchema, safeUrlFieldSchema } from "@/lib/support-directory/contact";

export const reportingDestinationSchema = baseRecordSchema.extend({
  name: z.string().min(1),
  destinationType: z.enum(DESTINATION_TYPES).optional(),
  /** "Short Description" — the pre-existing field name, reused as-is. */
  description: z.string().optional(),
  fullDescription: z.string().optional(),
  organisationId: z.string().optional(),

  resourceCategoryIds: z.array(z.string()).default([]),
  incidentTypeIds: z.array(z.string()).default([]),
  /** Typed Australian jurisdiction codes — upgraded this phase from the previous free-text singular `jurisdiction` field, matching Support Organisations/Professionals. */
  jurisdictions: z.array(z.enum(AUSTRALIAN_JURISDICTION_VALUES)).default([]),
  australiaWide: z.boolean().default(false),
  audienceGroups: z.array(z.string()).default([]),
  languages: z.array(z.string()).default(["en"]),
  tags: z.array(z.string()).default([]),

  /** The administrator's declared list of supported methods — see lib/support-directory/reporting-method.ts for how each is validated against the actual contact fields below. */
  reportingMethods: z.array(z.enum(REPORTING_METHODS)).default([]),
  phone: phoneFieldSchema,
  email: emailFieldSchema,
  website: safeUrlFieldSchema,
  onlineReportingUrl: safeUrlFieldSchema,
  bookingUrl: safeUrlFieldSchema,
  address: z.string().optional(),
  openingHours: z.string().optional(),

  /** "Clear user instructions" — required for Ready for review / Publish. */
  reportingInstructions: z.string().optional(),
  evidenceGuidance: z.string().optional(),
  eligibilityInformation: z.string().optional(),
  costInformation: z.string().optional(),
  /** Tri-state — `unknown` (the default) must never read as "No." See lib/models/reporting-destination-type.ts. */
  anonymousReporting: z.enum(TRISTATE_VALUES).default("unknown"),
  confidentialityInformation: z.string().optional(),
  /** Tri-state, explicit only — never inferred from `destinationType`. See README "Anonymous reporting and confidentiality wording." */
  emergencySuitability: z.enum(TRISTATE_VALUES).default("unknown"),
  responseExpectations: z.string().optional(),
  publicDisclaimer: z.string().optional(),

  /** Admin-only — never shown in a public preview or the Published Content Bundle. */
  sourceNotes: z.string().optional(),
  /** Required for Ready for review / Publish. */
  reviewDueDate: z.string().optional(),
  /** Set automatically on first transition to "published" — never hand-edited. */
  publishedDate: z.string().optional(),
  internalNotes: z.string().optional(),
});
export type ReportingDestination = z.infer<typeof reportingDestinationSchema>;
