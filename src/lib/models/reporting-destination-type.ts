import { z } from "zod";

/** A typed classification, not free text — see README "Reporting Destination model." */
export const DESTINATION_TYPES = [
  "police",
  "legal_aid",
  "discrimination_body",
  "workplace_body",
  "housing_body",
  "ombudsman",
  "education_body",
  "government_agency",
  "community_organisation",
  "internal_organisation",
  "online_platform",
  "other",
] as const;
export type DestinationType = (typeof DESTINATION_TYPES)[number];
export const destinationTypeSchema = z.enum(DESTINATION_TYPES);

export const DESTINATION_TYPE_LABEL: Record<DestinationType, string> = {
  police: "Police",
  legal_aid: "Legal aid",
  discrimination_body: "Discrimination body",
  workplace_body: "Workplace body",
  housing_body: "Housing body",
  ombudsman: "Ombudsman",
  education_body: "Education body",
  government_agency: "Government agency",
  community_organisation: "Community organisation",
  internal_organisation: "Internal organisation",
  online_platform: "Online platform",
  other: "Other",
};

/**
 * Whether a reporting method is actually usable is derived from real
 * contact/URL fields (see lib/support-directory/reporting-method.ts) — this
 * enum is only the administrator's declared list of which methods this
 * destination supports.
 */
export const REPORTING_METHODS = [
  "phone",
  "email",
  "online_form",
  "website",
  "in_person",
  "appointment",
  "postal",
  "internal_route",
  "other",
] as const;
export type ReportingMethod = (typeof REPORTING_METHODS)[number];
export const reportingMethodSchema = z.enum(REPORTING_METHODS);

export const REPORTING_METHOD_LABEL: Record<ReportingMethod, string> = {
  phone: "Phone",
  email: "Email",
  online_form: "Online form",
  website: "Website",
  in_person: "In person",
  appointment: "Appointment",
  postal: "Postal",
  internal_route: "Internal route",
  other: "Other",
};

/**
 * Tri-state, not boolean: a missing/unconfirmed answer must never read as
 * "No" (see README "Anonymous reporting and confidentiality wording").
 * `unknown` is the default until an administrator explicitly confirms one
 * way or the other. The same shape is reused for `emergencySuitability` —
 * inferring emergency suitability from `destinationType` alone is exactly
 * the trap this tri-state avoids.
 */
export const TRISTATE_VALUES = ["yes", "no", "unknown"] as const;
export type TristateValue = (typeof TRISTATE_VALUES)[number];
export const tristateSchema = z.enum(TRISTATE_VALUES);

export const TRISTATE_LABEL: Record<TristateValue, string> = {
  yes: "Yes",
  no: "No",
  unknown: "Unknown / not confirmed",
};
