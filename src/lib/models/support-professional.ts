import { z } from "zod";

import { AUSTRALIAN_JURISDICTION_VALUES } from "@/lib/jurisdictions";
import { baseRecordSchema } from "@/lib/models/base";
import { VERIFICATION_STATUSES } from "@/lib/models/verification";
import { emailFieldSchema, phoneFieldSchema, safeUrlFieldSchema } from "@/lib/support-directory/contact";

export const PROFESSIONAL_TYPES = [
  "advocate",
  "counsellor",
  "case_worker",
  "support_worker",
  "legal_advocate",
  "cultural_support_worker",
  "victim_support_specialist",
  "other",
] as const;
export type ProfessionalType = (typeof PROFESSIONAL_TYPES)[number];

/**
 * Re-exported for existing call sites — the canonical definition (now
 * shared with Support Organisations, and widened from 3 to 5 states) lives
 * in lib/models/verification.ts. See README "Verification policy."
 */
export { VERIFICATION_STATUSES };
export type { VerificationStatus } from "@/lib/models/verification";

export const SUPPORT_MODES = ["phone", "video", "in_person", "chat", "email"] as const;
export type SupportMode = (typeof SUPPORT_MODES)[number];

export const COST_TYPES = ["free", "sliding_scale", "fee_for_service", "unknown"] as const;
export type CostType = (typeof COST_TYPES)[number];

export const PROFILE_PHOTO_MAX_BYTES = 3 * 1024 * 1024; // 3MB
export const PROFILE_PHOTO_ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const profilePhotoMetaSchema = z.object({
  fileName: z.string().min(1),
  fileSizeBytes: z.number().int().nonnegative(),
  fileType: z.string().min(1),
});
export type ProfilePhotoMeta = z.infer<typeof profilePhotoMetaSchema>;

export const supportProfessionalSchema = baseRecordSchema.extend({
  // Basic information
  fullName: z.string().min(1),
  displayName: z.string().optional(),
  professionalType: z.enum(PROFESSIONAL_TYPES),
  profilePhoto: profilePhotoMetaSchema.optional(),
  /**
   * A stable SupportOrganisation.id — never the organisation's name. This
   * phase replaced the previous free-text `organisation` field (which
   * stored a display string and could never support dependency tracking,
   * dangling-reference detection, or "published organisations only" new
   * selectors) with this typed reference; see README "Organisation ↔
   * professional relationship."
   */
  organisationId: z.string().optional(),
  jobTitle: z.string().optional(),
  shortIntroduction: z.string().optional(),
  fullBiography: z.string().optional(),

  // Matching and expertise
  areasOfSupport: z.array(z.string()).default([]),
  resourceCategoryIds: z.array(z.string()).default([]),
  incidentTypeIds: z.array(z.string()).default([]),
  triageLabelIds: z.array(z.string()).default([]),
  specialisations: z.array(z.string()).default([]),
  communitiesSupported: z.array(z.string()).default([]),
  ageGroupsSupported: z.array(z.string()).default([]),
  /** Typed Australian jurisdiction codes — upgraded this phase from free text, matching Support Organisations. */
  jurisdictions: z.array(z.enum(AUSTRALIAN_JURISDICTION_VALUES)).default([]),
  /** Serves the whole of Australia rather than (or in addition to) specific jurisdictions — see SupportOrganisation.australiaWide. */
  australiaWide: z.boolean().default(false),
  serviceLocations: z.array(z.string()).default([]),

  // Availability and access
  supportModes: z.array(z.enum(SUPPORT_MODES)).default([]),
  /** Administrator-maintained free text only — never a live/real-time signal. See README "Safety wording." */
  availability: z.string().optional(),
  timeZone: z.string().optional(),
  languages: z.array(z.string()).default(["en"]),
  accessibilitySupport: z.array(z.string()).default([]),
  costType: z.enum(COST_TYPES).default("unknown"),
  feeInformation: z.string().optional(),
  acceptingNewReferrals: z.boolean().default(false),

  // Contact and booking
  phone: phoneFieldSchema,
  email: emailFieldSchema,
  bookingUrl: safeUrlFieldSchema,
  organisationWebsite: safeUrlFieldSchema,
  officeAddress: z.string().optional(),
  referralInstructions: z.string().optional(),
  contactNotes: z.string().optional(),

  // Governance
  verificationStatus: z.enum(VERIFICATION_STATUSES).default("not_verified"),
  /** Admin-only — never shown in a public preview or the Published Content Bundle. Distinct from `internalReviewNotes` (general review notes). */
  verificationNotes: z.string().optional(),
  verifiedDate: z.string().optional(),
  verificationExpiryDate: z.string().optional(),
  credentials: z.array(z.string()).default([]),
  registrationOrMembershipDetails: z.string().optional(),
  dataSource: z.string().optional(),
  lastReviewedDate: z.string().optional(),
  /** Review Due Date — the pre-existing confirmed field name, reused as-is rather than adding a second `reviewDueDate` field. Required for Ready for review / Publish. */
  nextReviewDate: z.string().optional(),
  /** Set automatically on first transition to "published" — never hand-edited. */
  publishedDate: z.string().optional(),
  internalReviewNotes: z.string().optional(),
});
export type SupportProfessional = z.infer<typeof supportProfessionalSchema> & {
  /** Raw image bytes, stored directly in IndexedDB. Never present in JSON bundle exports. */
  profilePhotoBlob?: Blob;
};

/**
 * A profile may be published while unverified — verification and
 * publication are independent axes. The "Not verified" warning must remain
 * attached regardless of publication status (rendered via VerificationBadge,
 * which never relies on color alone).
 */
export function isPublishableWhileUnverified(): boolean {
  return true;
}

export function initialsForName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}
