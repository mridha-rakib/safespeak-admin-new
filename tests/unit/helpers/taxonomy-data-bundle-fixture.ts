import { createBaseFields } from "../../../src/lib/models/base";
import type { DocumentRecord } from "../../../src/lib/models/document";
import type { MatchingRule } from "../../../src/lib/models/matching-rule";
import type { Microcard } from "../../../src/lib/models/microcard";
import type { ReportingDestination } from "../../../src/lib/models/reporting-destination";
import type { RightsContent } from "../../../src/lib/models/rights-content";
import type { SupportOrganisation } from "../../../src/lib/models/support-organisation";
import type { SupportProfessional } from "../../../src/lib/models/support-professional";
import type { TaxonomyDataBundle } from "../../../src/lib/taxonomy/dependency-service";
import { makeTestDocument } from "./document-fixture";

/** An otherwise-empty TaxonomyDataBundle — tests override just the domain(s) under test. */
export function makeEmptyTaxonomyDataBundle(overrides: Partial<TaxonomyDataBundle> = {}): TaxonomyDataBundle {
  return {
    documents: [],
    microcards: [],
    rightsContent: [],
    supportOrganisations: [],
    supportProfessionals: [],
    reportingDestinations: [],
    matchingRules: [],
    incidentTypes: [],
    triageLabels: [],
    resourceCategories: [],
    ...overrides,
  };
}

export function makeTestReferencingDocument(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return makeTestDocument(overrides);
}

export function makeTestMicrocard(overrides: Partial<Microcard> = {}): Microcard {
  return {
    ...createBaseFields({ status: "published" }),
    title: "Test Microcard",
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

export function makeTestRightsContent(overrides: Partial<RightsContent> = {}): RightsContent {
  return {
    ...createBaseFields({ status: "published" }),
    title: "Test Rights Content",
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

export function makeTestSupportOrganisation(overrides: Partial<SupportOrganisation> = {}): SupportOrganisation {
  return {
    ...createBaseFields({ status: "published" }),
    name: "Test Support Organisation",
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

export function makeTestSupportProfessional(overrides: Partial<SupportProfessional> = {}): SupportProfessional {
  return {
    ...createBaseFields({ status: "published" }),
    fullName: "Test Professional",
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

export function makeTestReportingDestination(overrides: Partial<ReportingDestination> = {}): ReportingDestination {
  return {
    ...createBaseFields({ status: "published" }),
    name: "Test Reporting Destination",
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

export function makeTestMatchingRule(overrides: Partial<MatchingRule> = {}): MatchingRule {
  return {
    ...createBaseFields({ status: "published" }),
    name: "Test Matching Rule",
    machineKey: "test_matching_rule",
    description: "A short description.",
    priority: 0,
    enabled: true,
    topicKeys: [],
    incidentTypeIds: [],
    jurisdictions: [],
    urgencyLevels: [],
    triageLabelIds: [],
    resourceCategoryIds: [],
    supportNeeds: [],
    legislationIds: [],
    microcardIds: [],
    rightsContentIds: [],
    supportOrganisationIds: [],
    supportProfessionalIds: [],
    reportingDestinationIds: [],
    ...overrides,
  };
}
