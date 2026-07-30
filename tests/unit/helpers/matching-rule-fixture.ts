import { createBaseFields } from "../../../src/lib/models/base";
import type { DocumentRecord } from "../../../src/lib/models/document";
import type { IncidentType } from "../../../src/lib/models/incident-type";
import type { MatchingRule } from "../../../src/lib/models/matching-rule";
import type { Microcard } from "../../../src/lib/models/microcard";
import type { ReportingDestination } from "../../../src/lib/models/reporting-destination";
import type { ResourceCategory } from "../../../src/lib/models/resource-category";
import type { RightsContent } from "../../../src/lib/models/rights-content";
import type { SupportOrganisation } from "../../../src/lib/models/support-organisation";
import type { SupportProfessional } from "../../../src/lib/models/support-professional";
import type { TriageLabel } from "../../../src/lib/models/triage-label";
import type { MatchingRuleEligibilityContext } from "../../../src/lib/matching-rules/eligibility";

/** A published incident type a fully-eligible matching rule fixture can reference as a condition. */
export function makeTestConditionIncidentType(overrides: Partial<IncidentType> = {}): IncidentType {
  return {
    ...createBaseFields({ status: "published" }),
    id: "fixture-incident-type",
    name: "Fixture Incident Type",
    machineKey: "fixture_incident_type",
    description: "A short description.",
    displayOrder: 0,
    defaultUrgency: "not_set",
    relatedResourceCategoryIds: [],
    ...overrides,
  };
}

export function makeTestConditionTriageLabel(overrides: Partial<TriageLabel> = {}): TriageLabel {
  return {
    ...createBaseFields({ status: "published" }),
    id: "fixture-triage-label",
    name: "Fixture Triage Label",
    machineKey: "fixture_triage_label",
    description: "A short description.",
    labelGroup: "other",
    displayOrder: 0,
    urgencyLevel: "moderate",
    ...overrides,
  };
}

export function makeTestConditionResourceCategory(overrides: Partial<ResourceCategory> = {}): ResourceCategory {
  return {
    ...createBaseFields({ status: "published" }),
    id: "fixture-resource-category",
    name: "Fixture Resource Category",
    machineKey: "fixture_resource_category",
    description: "A short description.",
    displayOrder: 0,
    ...overrides,
  };
}

export function makeTestRecommendedMicrocard(overrides: Partial<Microcard> = {}): Microcard {
  return {
    ...createBaseFields({ status: "published" }),
    id: "fixture-microcard",
    title: "Fixture Microcard",
    summary: "A short summary.",
    tags: [],
    incidentTypeIds: [],
    priority: "normal",
    displayOrder: 0,
    relatedLegislationIds: [],
    relatedSupportOrganisationIds: [],
    cta: { type: "none" },
    ...overrides,
  };
}

export function makeTestRecommendedRightsContent(overrides: Partial<RightsContent> = {}): RightsContent {
  return {
    ...createBaseFields({ status: "published" }),
    id: "fixture-rights-content",
    title: "Fixture Rights Content",
    summary: "A short summary.",
    relatedLegislationIds: [],
    incidentTypeIds: [],
    tags: [],
    resourceCategoryIds: [],
    relatedSupportOrganisationIds: [],
    priority: "normal",
    ...overrides,
  };
}

export function makeTestRecommendedSupportOrganisation(overrides: Partial<SupportOrganisation> = {}): SupportOrganisation {
  return {
    ...createBaseFields({ status: "published" }),
    id: "fixture-support-organisation",
    name: "Fixture Support Organisation",
    servicesOffered: [],
    resourceCategoryIds: [],
    incidentTypeIds: [],
    jurisdictions: [],
    australiaWide: false,
    audienceGroups: [],
    languages: ["en"],
    serviceDeliveryModes: [],
    tags: [],
    emergencyService: false,
    verificationStatus: "not_verified",
    ...overrides,
  };
}

export function makeTestRecommendedSupportProfessional(overrides: Partial<SupportProfessional> = {}): SupportProfessional {
  return {
    ...createBaseFields({ status: "published" }),
    id: "fixture-support-professional",
    fullName: "Fixture Professional",
    professionalType: "advocate",
    areasOfSupport: [],
    resourceCategoryIds: [],
    incidentTypeIds: [],
    triageLabelIds: [],
    specialisations: [],
    communitiesSupported: [],
    ageGroupsSupported: [],
    jurisdictions: [],
    australiaWide: false,
    serviceLocations: [],
    supportModes: [],
    languages: ["en"],
    accessibilitySupport: [],
    costType: "unknown",
    acceptingNewReferrals: false,
    verificationStatus: "not_verified",
    credentials: [],
    ...overrides,
  } as SupportProfessional;
}

export function makeTestRecommendedReportingDestination(overrides: Partial<ReportingDestination> = {}): ReportingDestination {
  return {
    ...createBaseFields({ status: "published" }),
    id: "fixture-reporting-destination",
    name: "Fixture Reporting Destination",
    resourceCategoryIds: [],
    incidentTypeIds: [],
    jurisdictions: [],
    australiaWide: false,
    audienceGroups: [],
    languages: ["en"],
    tags: [],
    reportingMethods: [],
    anonymousReporting: "unknown",
    emergencySuitability: "unknown",
    ...overrides,
  };
}

export function makeTestRecommendedDocument(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    ...createBaseFields({ status: "published" }),
    id: "fixture-document",
    title: "Fixture Legislation Document",
    sourceType: "legislation",
    sourceCategory: "Federal legislation",
    jurisdiction: "commonwealth",
    language: "en",
    licenseStatus: "government_open_license",
    relevantSections: [],
    tags: [],
    incidentTypeIds: [],
    priority: "medium",
    aiUsagePermission: true,
    legalReviewComplete: true,
    processingStatus: "ready_for_ai_processing",
    extractionStatus: "extracted",
    localPreviewStatus: "available",
    ...overrides,
  };
}

/** A full eligibility context whose default records are exactly the ones `makeTestMatchingRule()` references by default — a fully-eligible rule against this context has zero blockers. */
export function makeTestMatchingRuleEligibilityContext(
  overrides: Partial<MatchingRuleEligibilityContext> = {}
): MatchingRuleEligibilityContext {
  return {
    incidentTypes: [makeTestConditionIncidentType()],
    triageLabels: [makeTestConditionTriageLabel()],
    resourceCategories: [makeTestConditionResourceCategory()],
    microcards: [makeTestRecommendedMicrocard()],
    rightsContent: [makeTestRecommendedRightsContent()],
    supportOrganisations: [makeTestRecommendedSupportOrganisation()],
    supportProfessionals: [makeTestRecommendedSupportProfessional()],
    reportingDestinations: [makeTestRecommendedReportingDestination()],
    documents: [makeTestRecommendedDocument()],
    ...overrides,
  };
}

/**
 * A matching rule that is fully eligible (zero blockers) against
 * `makeTestMatchingRuleEligibilityContext()` by default: every required
 * field is set, at least one condition and one recommendation are present,
 * and every referenced id resolves to a `published` fixture record above.
 */
export function makeTestMatchingRule(overrides: Partial<MatchingRule> = {}): MatchingRule {
  return {
    ...createBaseFields({ status: "published" }),
    name: "Test Matching Rule",
    machineKey: "test_matching_rule",
    description: "A short description.",
    priority: 0,
    enabled: true,
    topicKeys: [],
    incidentTypeIds: ["fixture-incident-type"],
    triageLabelIds: ["fixture-triage-label"],
    resourceCategoryIds: ["fixture-resource-category"],
    jurisdictions: [],
    urgencyLevels: [],
    supportNeeds: [],
    legislationIds: ["fixture-document"],
    microcardIds: ["fixture-microcard"],
    rightsContentIds: ["fixture-rights-content"],
    supportOrganisationIds: ["fixture-support-organisation"],
    supportProfessionalIds: ["fixture-support-professional"],
    reportingDestinationIds: ["fixture-reporting-destination"],
    reviewDueDate: "2027-01-01",
    ...overrides,
  };
}
