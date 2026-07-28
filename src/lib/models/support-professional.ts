import { z } from "zod";

import { baseRecordSchema } from "@/lib/models/base";

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
 * verified: confirmed by the local administrator.
 * not_verified: no confirmation has taken place — the default for new records.
 * pending_review: verification has been started but not concluded.
 * A profile never silently inherits "verified" from its organisation.
 */
export const VERIFICATION_STATUSES = ["verified", "not_verified", "pending_review"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

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
  organisation: z.string().optional(),
  jobTitle: z.string().optional(),
  shortIntroduction: z.string().optional(),
  fullBiography: z.string().optional(),

  // Matching and expertise
  areasOfSupport: z.array(z.string()).default([]),
  incidentTypeIds: z.array(z.string()).default([]),
  triageLabelIds: z.array(z.string()).default([]),
  specialisations: z.array(z.string()).default([]),
  communitiesSupported: z.array(z.string()).default([]),
  ageGroupsSupported: z.array(z.string()).default([]),
  jurisdictions: z.array(z.string()).default([]),
  serviceLocations: z.array(z.string()).default([]),

  // Availability and access
  supportModes: z.array(z.enum(SUPPORT_MODES)).default([]),
  availability: z.string().optional(),
  timeZone: z.string().optional(),
  languages: z.array(z.string()).default(["en"]),
  accessibilitySupport: z.array(z.string()).default([]),
  costType: z.enum(COST_TYPES).default("unknown"),
  feeInformation: z.string().optional(),
  acceptingNewReferrals: z.boolean().default(false),

  // Contact and booking
  phone: z.string().optional(),
  email: z.email().optional().or(z.literal("")),
  bookingUrl: z.url().optional().or(z.literal("")),
  organisationWebsite: z.url().optional().or(z.literal("")),
  officeAddress: z.string().optional(),
  referralInstructions: z.string().optional(),
  contactNotes: z.string().optional(),

  // Governance
  verificationStatus: z.enum(VERIFICATION_STATUSES).default("not_verified"),
  credentials: z.array(z.string()).default([]),
  registrationOrMembershipDetails: z.string().optional(),
  dataSource: z.string().optional(),
  lastReviewedDate: z.string().optional(),
  nextReviewDate: z.string().optional(),
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
