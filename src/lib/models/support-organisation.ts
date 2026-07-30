import { z } from "zod";

import { AUSTRALIAN_JURISDICTION_VALUES } from "@/lib/jurisdictions";
import { baseRecordSchema } from "@/lib/models/base";
import { ORGANISATION_TYPES } from "@/lib/models/organisation-type";
import { SUPPORT_MODES } from "@/lib/models/support-professional";
import { VERIFICATION_STATUSES } from "@/lib/models/verification";
import { emailFieldSchema, phoneFieldSchema, safeUrlFieldSchema } from "@/lib/support-directory/contact";

export const supportOrganisationSchema = baseRecordSchema.extend({
  name: z.string().min(1),
  organisationType: z.enum(ORGANISATION_TYPES).optional(),
  shortDescription: z.string().optional(),
  /** Full public-facing service description — distinct from `shortDescription` (a one-line summary) and `servicesOffered` (a short tag list). */
  fullDescription: z.string().optional(),

  /** Legacy Phase 1 free-text tag list, preserved (still lightly exposed) — distinct from the newer typed `resourceCategoryIds`. */
  servicesOffered: z.array(z.string()).default([]),
  resourceCategoryIds: z.array(z.string()).default([]),
  incidentTypeIds: z.array(z.string()).default([]),
  /** Typed Australian jurisdiction codes — upgraded this phase from free text; see lib/jurisdictions.ts. */
  jurisdictions: z.array(z.enum(AUSTRALIAN_JURISDICTION_VALUES)).default([]),
  /** An explicit "serves the whole of Australia" flag — required so publish eligibility can accept this in place of at least one jurisdiction, rather than treating an empty `jurisdictions` array as ambiguous. */
  australiaWide: z.boolean().default(false),
  audienceGroups: z.array(z.string()).default([]),
  languages: z.array(z.string()).default(["en"]),
  /** Reuses SupportProfessional's SUPPORT_MODES — "how the service is delivered" is the same concept for an organisation as for an individual professional, not a second enum. */
  serviceDeliveryModes: z.array(z.enum(SUPPORT_MODES)).default([]),
  tags: z.array(z.string()).default([]),

  eligibilityInformation: z.string().optional(),
  costInformation: z.string().optional(),
  openingHours: z.string().optional(),
  accessibilityInformation: z.string().optional(),
  /** Administrator-declared only — never inferred from organisation type. See README "Safety wording." */
  emergencyService: z.boolean().default(false),

  phone: phoneFieldSchema,
  email: emailFieldSchema,
  website: safeUrlFieldSchema,
  bookingUrl: safeUrlFieldSchema,
  referralUrl: safeUrlFieldSchema,
  /** "Physical Address" — the pre-existing field name, reused as-is. */
  address: z.string().optional(),
  postalAddress: z.string().optional(),

  /** Local administrative verification — independent of `status` (publication). See lib/models/verification.ts and README "Verification policy." */
  verificationStatus: z.enum(VERIFICATION_STATUSES).default("not_verified"),
  /** Admin-only — never shown in a public preview or the Published Content Bundle. */
  verificationNotes: z.string().optional(),
  verifiedDate: z.string().optional(),
  verificationExpiryDate: z.string().optional(),

  /** Required for Ready for review / Publish — see lib/support-directory/support-organisation-eligibility.ts. */
  reviewDueDate: z.string().optional(),
  /** Set automatically on first transition to "published" — never hand-edited. */
  publishedDate: z.string().optional(),
  internalNotes: z.string().optional(),
});
export type SupportOrganisation = z.infer<typeof supportOrganisationSchema>;
