import { z } from "zod";

/** A typed classification, not free text — see README "Support Organisation model." */
export const ORGANISATION_TYPES = [
  "community_support",
  "legal_service",
  "counselling_service",
  "crisis_support",
  "health_service",
  "housing_service",
  "financial_support",
  "advocacy_service",
  "government_service",
  "cultural_community_service",
  "youth_service",
  "other",
] as const;
export type OrganisationType = (typeof ORGANISATION_TYPES)[number];
export const organisationTypeSchema = z.enum(ORGANISATION_TYPES);

export const ORGANISATION_TYPE_LABEL: Record<OrganisationType, string> = {
  community_support: "Community support",
  legal_service: "Legal service",
  counselling_service: "Counselling service",
  crisis_support: "Crisis support",
  health_service: "Health service",
  housing_service: "Housing service",
  financial_support: "Financial support",
  advocacy_service: "Advocacy service",
  government_service: "Government service",
  cultural_community_service: "Cultural / community service",
  youth_service: "Youth service",
  other: "Other",
};
