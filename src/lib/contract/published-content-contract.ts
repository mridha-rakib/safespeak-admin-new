import { z } from "zod";

/**
 * Phase 6 — canonical public mock content contract.
 *
 * This is the ONE versioned shape that both `safespeak-admin` (the source of
 * the deterministic mock bundle) and `safespeak-frontend` (the consumer)
 * agree on. There is no shared workspace/package linking the two
 * applications (each is independently buildable, its own git repo, its own
 * lockfile) — see docs/ARCHITECTURE.md "Phase 6 — canonical contract
 * strategy." Instead this file is the source of truth and is PHYSICALLY
 * COPIED (byte-for-byte, via `scripts/generate-mock-bundle.ts`'s
 * `syncContractToFrontend()` step) into
 * `safespeak-frontend/src/lib/mock-contract/published-content-contract.ts`.
 * The copy is clearly marked generated and is never hand-edited — change
 * THIS file, then re-run the generation script.
 *
 * Every `PublishedX` type here is a field allow-list that mirrors (and is
 * validated against) this app's own `lib/**\/export-transform.ts` /
 * `lib/support-directory/*-export.ts` output shapes exactly — see
 * `scripts/generate-mock-bundle.ts` for the parity check that fails loudly
 * if an admin export shape and this contract ever drift apart.
 *
 * No admin-only field appears anywhere below: no internal notes, source
 * notes, verification notes, audit events, Dexie metadata, object URLs,
 * file-system paths, form state, debug validation data, secrets, or private
 * prompts.
 */

export const PUBLIC_CONTRACT_SCHEMA_VERSION = "1.0.0";
export const PUBLIC_CONTRACT_PURPOSE = "published_content" as const;

// ---------------------------------------------------------------------------
// Shared enum vocabularies — mirror the corresponding lib/models/*.ts values
// exactly. Duplicated here deliberately (not imported) because this file is
// physically copied into a second, independent application with no runtime
// dependency on `safespeak-admin`'s module graph.
// ---------------------------------------------------------------------------

export const CONTRACT_CONTENT_STATUSES = ["draft", "ready_for_review", "published", "needs_update", "archived"] as const;
export const contractContentStatusSchema = z.enum(CONTRACT_CONTENT_STATUSES);
export type ContractContentStatus = (typeof CONTRACT_CONTENT_STATUSES)[number];

export const CONTRACT_JURISDICTIONS = ["commonwealth", "nsw", "vic", "qld", "wa", "sa", "tas", "act", "nt"] as const;
export const contractJurisdictionSchema = z.enum(CONTRACT_JURISDICTIONS);
export type ContractJurisdiction = (typeof CONTRACT_JURISDICTIONS)[number];

export const CONTRACT_VERIFICATION_STATUSES = [
  "not_verified",
  "verification_pending",
  "verified",
  "verification_expired",
  "verification_rejected",
] as const;
export const contractVerificationStatusSchema = z.enum(CONTRACT_VERIFICATION_STATUSES);
export type ContractVerificationStatus = (typeof CONTRACT_VERIFICATION_STATUSES)[number];

export const CONTRACT_TRISTATE_VALUES = ["yes", "no", "unknown"] as const;
export const contractTristateSchema = z.enum(CONTRACT_TRISTATE_VALUES);
export type ContractTristateValue = (typeof CONTRACT_TRISTATE_VALUES)[number];

export const CONTRACT_CONTENT_PRIORITIES = ["low", "normal", "high", "critical"] as const;
export const contractContentPrioritySchema = z.enum(CONTRACT_CONTENT_PRIORITIES);
export type ContractContentPriority = (typeof CONTRACT_CONTENT_PRIORITIES)[number];

export const CONTRACT_URGENCY_LEVELS = ["low", "moderate", "high", "critical"] as const;
export const contractUrgencyLevelSchema = z.enum(CONTRACT_URGENCY_LEVELS);
export type ContractUrgencyLevel = (typeof CONTRACT_URGENCY_LEVELS)[number];

export const CONTRACT_ASSISTANT_TOPIC_KEYS = [
  "general_assistant",
  "domestic_violence",
  "racial_abuse",
  "cyber_scam",
  "migrant_challenges",
] as const;
export const contractAssistantTopicSchema = z.enum(CONTRACT_ASSISTANT_TOPIC_KEYS);
export type ContractAssistantTopic = (typeof CONTRACT_ASSISTANT_TOPIC_KEYS)[number];

export const CONTRACT_MICROCARD_CTA_TYPES = [
  "none",
  "view_rights_information",
  "view_legislation_source",
  "view_support_service",
  "start_report",
  "open_internal_route",
  "open_safe_external_link",
] as const;
export const contractMicrocardCtaSchema = z.object({
  type: z.enum(CONTRACT_MICROCARD_CTA_TYPES),
  label: z.string().optional(),
  target: z.string().optional(),
});
export type ContractMicrocardCta = z.infer<typeof contractMicrocardCtaSchema>;

export const CONTRACT_ORGANISATION_TYPES = [
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
export const contractOrganisationTypeSchema = z.enum(CONTRACT_ORGANISATION_TYPES);
export type ContractOrganisationType = (typeof CONTRACT_ORGANISATION_TYPES)[number];

export const CONTRACT_PROFESSIONAL_TYPES = [
  "advocate",
  "counsellor",
  "case_worker",
  "support_worker",
  "legal_advocate",
  "cultural_support_worker",
  "victim_support_specialist",
  "other",
] as const;
export const contractProfessionalTypeSchema = z.enum(CONTRACT_PROFESSIONAL_TYPES);
export type ContractProfessionalType = (typeof CONTRACT_PROFESSIONAL_TYPES)[number];

export const CONTRACT_SUPPORT_MODES = ["phone", "video", "in_person", "chat", "email"] as const;
export const contractSupportModeSchema = z.enum(CONTRACT_SUPPORT_MODES);
export type ContractSupportMode = (typeof CONTRACT_SUPPORT_MODES)[number];

export const CONTRACT_COST_TYPES = ["free", "sliding_scale", "fee_for_service", "unknown"] as const;
export const contractCostTypeSchema = z.enum(CONTRACT_COST_TYPES);
export type ContractCostType = (typeof CONTRACT_COST_TYPES)[number];

export const CONTRACT_DESTINATION_TYPES = [
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
export const contractDestinationTypeSchema = z.enum(CONTRACT_DESTINATION_TYPES);
export type ContractDestinationType = (typeof CONTRACT_DESTINATION_TYPES)[number];

export const CONTRACT_REPORTING_METHODS = [
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
export const contractReportingMethodSchema = z.enum(CONTRACT_REPORTING_METHODS);
export type ContractReportingMethod = (typeof CONTRACT_REPORTING_METHODS)[number];

export const CONTRACT_MICROCARD_CARD_TYPES = [
  "quick_guidance",
  "safety_tip",
  "rights_summary",
  "next_step",
  "evidence_tip",
  "support_option",
  "preparation_tip",
  "other",
] as const;
export const contractMicrocardCardTypeSchema = z.enum(CONTRACT_MICROCARD_CARD_TYPES);
export type ContractMicrocardCardType = (typeof CONTRACT_MICROCARD_CARD_TYPES)[number];

export const CONTRACT_RIGHTS_CONTENT_TYPES = [
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
export const contractRightsContentTypeSchema = z.enum(CONTRACT_RIGHTS_CONTENT_TYPES);
export type ContractRightsContentType = (typeof CONTRACT_RIGHTS_CONTENT_TYPES)[number];

// ---------------------------------------------------------------------------
// Base fields every published record carries.
// ---------------------------------------------------------------------------

const publishedBaseFields = {
  id: z.string().min(1),
  status: contractContentStatusSchema,
  isDemo: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  version: z.number().int().nonnegative(),
};

// ---------------------------------------------------------------------------
// PublishedIncidentType / PublishedTriageLabel / PublishedResourceCategory
// ---------------------------------------------------------------------------

export const publishedIncidentTypeSchema = z.object({
  ...publishedBaseFields,
  name: z.string().min(1),
  machineKey: z.string().min(1),
  description: z.string().optional(),
  displayOrder: z.number().int().nonnegative(),
  defaultUrgency: z.enum(["not_set", "low", "medium", "high", "critical"]),
  userFacingLabel: z.string().optional(),
  relatedResourceCategoryIds: z.array(z.string()).default([]),
});
export type PublishedIncidentType = z.infer<typeof publishedIncidentTypeSchema>;

export const CONTRACT_LABEL_GROUPS = [
  "safety",
  "urgency",
  "context_indicator",
  "bias_indicator",
  "support_need",
  "accessibility_need",
  "other",
] as const;
export const publishedTriageLabelSchema = z.object({
  ...publishedBaseFields,
  name: z.string().min(1),
  machineKey: z.string().min(1),
  description: z.string().optional(),
  labelGroup: z.enum(CONTRACT_LABEL_GROUPS),
  displayOrder: z.number().int().nonnegative(),
});
export type PublishedTriageLabel = z.infer<typeof publishedTriageLabelSchema>;

export const publishedResourceCategorySchema = z.object({
  ...publishedBaseFields,
  name: z.string().min(1),
  machineKey: z.string().min(1),
  description: z.string().optional(),
  displayOrder: z.number().int().nonnegative(),
  iconKey: z.string().optional(),
  accentToken: z.string().optional(),
});
export type PublishedResourceCategory = z.infer<typeof publishedResourceCategorySchema>;

// ---------------------------------------------------------------------------
// PublishedLegislationSource
// ---------------------------------------------------------------------------

export const publishedLegislationSourceSchema = z.object({
  ...publishedBaseFields,
  title: z.string().min(1),
  legislationName: z.string().optional(),
  sourceType: z.enum(["legislation", "regulation", "policy", "guideline", "case_law", "other"]),
  sourceCategory: z.string().optional(),
  authorityOrPublisher: z.string().optional(),
  jurisdiction: z.string().optional(),
  language: z.string().min(1),
  actNumber: z.string().optional(),
  documentVersionLabel: z.string().optional(),
  sourceUrl: z.string().optional(),
  effectiveDate: z.string().optional(),
  lastUpdatedDate: z.string().optional(),
  nextReviewDate: z.string().optional(),
  licenseStatus: z.enum([
    "public_domain",
    "government_open_license",
    "restricted_internal_use",
    "requires_permission",
    "unknown",
  ]),
  relevantSections: z.array(z.string()).default([]),
  topic: z.string().optional(),
  tags: z.array(z.string()).default([]),
  incidentTypeIds: z.array(z.string()).default([]),
  priority: z.enum(["low", "medium", "high"]),
  file: z.object({ fileName: z.string(), pageCount: z.number().int().nonnegative().optional() }).optional(),
  aiUsagePermission: z.boolean(),
  aiEligible: z.boolean(),
});
export type PublishedLegislationSource = z.infer<typeof publishedLegislationSourceSchema>;

// ---------------------------------------------------------------------------
// PublishedMicrocard
// ---------------------------------------------------------------------------

export const publishedMicrocardSchema = z.object({
  ...publishedBaseFields,
  title: z.string().min(1),
  summary: z.string().min(1),
  body: z.string().optional(),
  topic: z.string().optional(),
  tags: z.array(z.string()).default([]),
  incidentTypeIds: z.array(z.string()).default([]),
  cardType: contractMicrocardCardTypeSchema.optional(),
  resourceCategoryId: z.string().optional(),
  jurisdiction: contractJurisdictionSchema.optional(),
  priority: contractContentPrioritySchema,
  displayOrder: z.number().int().nonnegative(),
  reviewDueDate: z.string().optional(),
  relatedLegislationIds: z.array(z.string()).default([]),
  relatedSupportOrganisationIds: z.array(z.string()).default([]),
  cta: contractMicrocardCtaSchema,
  publishedDate: z.string().optional(),
});
export type PublishedMicrocard = z.infer<typeof publishedMicrocardSchema>;

// ---------------------------------------------------------------------------
// PublishedRightsContent
// ---------------------------------------------------------------------------

export const publishedRightsContentSchema = z.object({
  ...publishedBaseFields,
  title: z.string().min(1),
  summary: z.string().min(1),
  body: z.string().optional(),
  jurisdiction: contractJurisdictionSchema.optional(),
  relatedLegislationIds: z.array(z.string()).default([]),
  incidentTypeIds: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  contentType: contractRightsContentTypeSchema.optional(),
  resourceCategoryIds: z.array(z.string()).default([]),
  relatedSupportOrganisationIds: z.array(z.string()).default([]),
  priority: contractContentPrioritySchema,
  reviewDueDate: z.string().optional(),
  effectiveFromDate: z.string().optional(),
  publishedDate: z.string().optional(),
  publicDisclaimer: z.string().optional(),
});
export type PublishedRightsContent = z.infer<typeof publishedRightsContentSchema>;

// ---------------------------------------------------------------------------
// PublishedSupportOrganisation
// ---------------------------------------------------------------------------

export const publishedSupportOrganisationSchema = z.object({
  ...publishedBaseFields,
  name: z.string().min(1),
  organisationType: contractOrganisationTypeSchema.optional(),
  shortDescription: z.string().optional(),
  fullDescription: z.string().optional(),
  servicesOffered: z.array(z.string()).default([]),
  resourceCategoryIds: z.array(z.string()).default([]),
  incidentTypeIds: z.array(z.string()).default([]),
  jurisdictions: z.array(contractJurisdictionSchema).default([]),
  australiaWide: z.boolean(),
  audienceGroups: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  serviceDeliveryModes: z.array(contractSupportModeSchema).default([]),
  tags: z.array(z.string()).default([]),
  eligibilityInformation: z.string().optional(),
  costInformation: z.string().optional(),
  openingHours: z.string().optional(),
  accessibilityInformation: z.string().optional(),
  emergencyService: z.boolean(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  bookingUrl: z.string().optional(),
  referralUrl: z.string().optional(),
  address: z.string().optional(),
  postalAddress: z.string().optional(),
  verificationStatus: contractVerificationStatusSchema,
  verifiedDate: z.string().optional(),
  verificationExpiryDate: z.string().optional(),
  reviewDueDate: z.string().optional(),
  publishedDate: z.string().optional(),
});
export type PublishedSupportOrganisation = z.infer<typeof publishedSupportOrganisationSchema>;

// ---------------------------------------------------------------------------
// PublishedSupportProfessional
// ---------------------------------------------------------------------------

export const publishedSupportProfessionalSchema = z.object({
  ...publishedBaseFields,
  fullName: z.string().min(1),
  displayName: z.string().optional(),
  professionalType: contractProfessionalTypeSchema,
  profilePhoto: z
    .object({ fileName: z.string(), fileSizeBytes: z.number().int().nonnegative(), fileType: z.string() })
    .optional(),
  organisationId: z.string().optional(),
  jobTitle: z.string().optional(),
  shortIntroduction: z.string().optional(),
  fullBiography: z.string().optional(),
  areasOfSupport: z.array(z.string()).default([]),
  resourceCategoryIds: z.array(z.string()).default([]),
  incidentTypeIds: z.array(z.string()).default([]),
  triageLabelIds: z.array(z.string()).default([]),
  specialisations: z.array(z.string()).default([]),
  communitiesSupported: z.array(z.string()).default([]),
  ageGroupsSupported: z.array(z.string()).default([]),
  jurisdictions: z.array(contractJurisdictionSchema).default([]),
  australiaWide: z.boolean(),
  serviceLocations: z.array(z.string()).default([]),
  supportModes: z.array(contractSupportModeSchema).default([]),
  availability: z.string().optional(),
  timeZone: z.string().optional(),
  languages: z.array(z.string()).default([]),
  accessibilitySupport: z.array(z.string()).default([]),
  costType: contractCostTypeSchema,
  feeInformation: z.string().optional(),
  acceptingNewReferrals: z.boolean(),
  phone: z.string().optional(),
  email: z.string().optional(),
  bookingUrl: z.string().optional(),
  organisationWebsite: z.string().optional(),
  referralInstructions: z.string().optional(),
  verificationStatus: contractVerificationStatusSchema,
  verifiedDate: z.string().optional(),
  verificationExpiryDate: z.string().optional(),
  credentials: z.array(z.string()).default([]),
  registrationOrMembershipDetails: z.string().optional(),
  nextReviewDate: z.string().optional(),
  publishedDate: z.string().optional(),
});
export type PublishedSupportProfessional = z.infer<typeof publishedSupportProfessionalSchema>;

// ---------------------------------------------------------------------------
// PublishedReportingDestination
// ---------------------------------------------------------------------------

export const publishedReportingDestinationSchema = z.object({
  ...publishedBaseFields,
  name: z.string().min(1),
  destinationType: contractDestinationTypeSchema,
  description: z.string().optional(),
  fullDescription: z.string().optional(),
  organisationId: z.string().optional(),
  resourceCategoryIds: z.array(z.string()).default([]),
  incidentTypeIds: z.array(z.string()).default([]),
  jurisdictions: z.array(contractJurisdictionSchema).default([]),
  australiaWide: z.boolean(),
  audienceGroups: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  reportingMethods: z.array(contractReportingMethodSchema).default([]),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  onlineReportingUrl: z.string().optional(),
  bookingUrl: z.string().optional(),
  address: z.string().optional(),
  openingHours: z.string().optional(),
  reportingInstructions: z.string().optional(),
  evidenceGuidance: z.string().optional(),
  eligibilityInformation: z.string().optional(),
  costInformation: z.string().optional(),
  anonymousReporting: contractTristateSchema,
  confidentialityInformation: z.string().optional(),
  emergencySuitability: contractTristateSchema,
  responseExpectations: z.string().optional(),
  publicDisclaimer: z.string().optional(),
  reviewDueDate: z.string().optional(),
  publishedDate: z.string().optional(),
});
export type PublishedReportingDestination = z.infer<typeof publishedReportingDestinationSchema>;

// ---------------------------------------------------------------------------
// PublishedMatchingRule
// ---------------------------------------------------------------------------

export const publishedMatchingRuleSchema = z.object({
  ...publishedBaseFields,
  name: z.string().min(1),
  machineKey: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.number().int(),
  /** Preserved as-is even when false — the mock matching engine (not this contract) is responsible for skipping disabled rules at execution time. See lib/matching-rules/engine.ts "enabled rules only." */
  enabled: z.boolean(),
  topicKeys: z.array(contractAssistantTopicSchema).default([]),
  incidentTypeIds: z.array(z.string()).default([]),
  triageLabelIds: z.array(z.string()).default([]),
  resourceCategoryIds: z.array(z.string()).default([]),
  jurisdictions: z.array(contractJurisdictionSchema).default([]),
  urgencyLevels: z.array(contractUrgencyLevelSchema).default([]),
  supportNeeds: z.array(z.string()).default([]),
  legislationIds: z.array(z.string()).default([]),
  microcardIds: z.array(z.string()).default([]),
  rightsContentIds: z.array(z.string()).default([]),
  supportOrganisationIds: z.array(z.string()).default([]),
  supportProfessionalIds: z.array(z.string()).default([]),
  reportingDestinationIds: z.array(z.string()).default([]),
  publishedDate: z.string().optional(),
});
export type PublishedMatchingRule = z.infer<typeof publishedMatchingRuleSchema>;

// ---------------------------------------------------------------------------
// The bundle itself
// ---------------------------------------------------------------------------

export const publishedMockContentManifestSchema = z.object({
  schemaVersion: z.literal(PUBLIC_CONTRACT_SCHEMA_VERSION),
  purpose: z.literal(PUBLIC_CONTRACT_PURPOSE),
  generatedAt: z.string().min(1),
  sourceApplication: z.literal("safespeak-admin"),
  recordCounts: z.record(z.string(), z.number().int().nonnegative()),
  warnings: z.array(z.string()).default([]),
});
export type PublishedMockContentManifest = z.infer<typeof publishedMockContentManifestSchema>;

export const publishedMockContentBundleSchema = z.object({
  manifest: publishedMockContentManifestSchema,
  data: z.object({
    incidentTypes: z.array(publishedIncidentTypeSchema),
    triageLabels: z.array(publishedTriageLabelSchema),
    resourceCategories: z.array(publishedResourceCategorySchema),
    legislationSources: z.array(publishedLegislationSourceSchema),
    microcards: z.array(publishedMicrocardSchema),
    rightsContent: z.array(publishedRightsContentSchema),
    supportOrganisations: z.array(publishedSupportOrganisationSchema),
    supportProfessionals: z.array(publishedSupportProfessionalSchema),
    reportingDestinations: z.array(publishedReportingDestinationSchema),
    matchingRules: z.array(publishedMatchingRuleSchema),
  }),
});
export type PublishedMockContentBundle = z.infer<typeof publishedMockContentBundleSchema>;
export type PublishedMockContentDomain = keyof PublishedMockContentBundle["data"];

// ---------------------------------------------------------------------------
// Mock matching runtime contract — not part of the published bundle itself,
// but the shared shape the deterministic matching engine (ported identically
// into both applications — see lib/matching-rules/engine.ts and
// safespeak-frontend/src/lib/mock-contract/matching-engine.ts) consumes and
// produces. Unknown/missing incident-context values are preserved as
// `undefined`, never coerced to `false` or an empty guess — see
// docs/ARCHITECTURE.md "Mock Incident Context."
// ---------------------------------------------------------------------------

export const mockIncidentContextSchema = z.object({
  assistantTopic: contractAssistantTopicSchema,
  incidentTypeIds: z.array(z.string()).default([]),
  triageLabelIds: z.array(z.string()).default([]),
  jurisdiction: contractJurisdictionSchema.optional(),
  urgency: contractUrgencyLevelSchema.optional(),
  supportNeeds: z.array(z.string()).default([]),
  userLanguage: z.string().optional(),
  reportingInterest: z.boolean().optional(),
  rightsInformationInterest: z.boolean().optional(),
  professionalSupportInterest: z.boolean().optional(),
  evidenceGuidanceInterest: z.boolean().optional(),
  /** Never set from topic alone — see docs/ARCHITECTURE.md "Topic alone must not set immediate danger." */
  immediateDangerSignal: z.boolean().optional(),
  mockScenarioId: z.string(),
  contextVersion: z.literal(1),
});
export type MockIncidentContext = z.infer<typeof mockIncidentContextSchema>;

export const RECOMMENDATION_KINDS = [
  "microcard",
  "rights_content",
  "support_organisation",
  "support_professional",
  "reporting_destination",
  "legislation_source",
] as const;
export type RecommendationKind = (typeof RECOMMENDATION_KINDS)[number];

export const MATCH_REASON_CODES = [
  "topic_match",
  "incident_type_match",
  "triage_label_match",
  "jurisdiction_match",
  "australia_wide_fallback",
  "support_need_match",
  "rule_priority",
] as const;
export type MatchReasonCode = (typeof MATCH_REASON_CODES)[number];

export const mockMatchReasonSchema = z.object({
  code: z.enum(MATCH_REASON_CODES),
  ruleId: z.string(),
  ruleName: z.string(),
  detail: z.string(),
});
export type MockMatchReason = z.infer<typeof mockMatchReasonSchema>;

export const mockMatchedRecommendationSchema = z.object({
  kind: z.enum(RECOMMENDATION_KINDS),
  recordId: z.string(),
  reasons: z.array(mockMatchReasonSchema).min(1),
});
export type MockMatchedRecommendation = z.infer<typeof mockMatchedRecommendationSchema>;

export const mockMatchingRequestSchema = z.object({
  context: mockIncidentContextSchema,
});
export type MockMatchingRequest = z.infer<typeof mockMatchingRequestSchema>;

export const mockMatchingResultSchema = z.object({
  contractSchemaVersion: z.literal(PUBLIC_CONTRACT_SCHEMA_VERSION),
  matchingEngineVersion: z.string().min(1),
  triggeredRuleIds: z.array(z.string()),
  recommendations: z.object({
    microcards: z.array(mockMatchedRecommendationSchema),
    rightsContent: z.array(mockMatchedRecommendationSchema),
    supportOrganisations: z.array(mockMatchedRecommendationSchema),
    supportProfessionals: z.array(mockMatchedRecommendationSchema),
    reportingDestinations: z.array(mockMatchedRecommendationSchema),
    legislationSources: z.array(mockMatchedRecommendationSchema),
  }),
});
export type MockMatchingResult = z.infer<typeof mockMatchingResultSchema>;
