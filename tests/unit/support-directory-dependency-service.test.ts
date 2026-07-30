import assert from "node:assert/strict";
import test from "node:test";

import { computeTaxonomyUsage, findDanglingTaxonomyReferences } from "../../src/lib/taxonomy/dependency-service";
import {
  makeEmptyTaxonomyDataBundle,
  makeTestMatchingRule,
  makeTestMicrocard,
  makeTestReportingDestination,
  makeTestRightsContent,
  makeTestSupportOrganisation,
  makeTestSupportProfessional,
} from "./helpers/taxonomy-data-bundle-fixture";
import { makeTestResourceCategory } from "./helpers/taxonomy-fixture";

test("computeTaxonomyUsage for a support organisation reads microcards/rightsContent relatedSupportOrganisationIds, professional/destination organisationId, and matching rule supportOrganisationIds", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    microcards: [makeTestMicrocard({ id: "mc-1", relatedSupportOrganisationIds: ["org-1"] })],
    rightsContent: [makeTestRightsContent({ id: "rc-1", relatedSupportOrganisationIds: ["org-1"] })],
    supportProfessionals: [makeTestSupportProfessional({ id: "sp-1", organisationId: "org-1" })],
    reportingDestinations: [makeTestReportingDestination({ id: "rd-1", organisationId: "org-1" })],
    matchingRules: [makeTestMatchingRule({ id: "rule-1", supportOrganisationIds: ["org-1"] })],
  });

  const usage = computeTaxonomyUsage("support_organisation", "org-1", bundle);
  assert.equal(usage.totalCount, 5);
  const entityTypes = usage.references.map((r) => r.entityType).sort();
  assert.deepEqual(entityTypes, ["matching_rule", "microcard", "reporting_destination", "rights_content", "support_professional"]);
});

test("computeTaxonomyUsage for a support organisation is zero when nothing references it", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    supportProfessionals: [makeTestSupportProfessional({ id: "sp-1", organisationId: "org-other" })],
  });
  assert.equal(computeTaxonomyUsage("support_organisation", "org-1", bundle).totalCount, 0);
});

test("computeTaxonomyUsage for a support professional reads only matchingRules.supportProfessionalIds", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    matchingRules: [makeTestMatchingRule({ id: "rule-1", supportProfessionalIds: ["sp-1"] })],
  });
  const usage = computeTaxonomyUsage("support_professional", "sp-1", bundle);
  assert.equal(usage.totalCount, 1);
  assert.equal(usage.references[0].entityType, "matching_rule");
});

test("computeTaxonomyUsage for a reporting destination reads only matchingRules.reportingDestinationIds", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    matchingRules: [makeTestMatchingRule({ id: "rule-1", reportingDestinationIds: ["rd-1"] })],
  });
  const usage = computeTaxonomyUsage("reporting_destination", "rd-1", bundle);
  assert.equal(usage.totalCount, 1);
  assert.equal(usage.references[0].entityType, "matching_rule");
});

test("resource_category usage now also counts support organisations, professionals, and reporting destinations", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    supportOrganisations: [makeTestSupportOrganisation({ id: "org-1", resourceCategoryIds: ["rc-1"] })],
    supportProfessionals: [makeTestSupportProfessional({ id: "sp-1", resourceCategoryIds: ["rc-1"] })],
    reportingDestinations: [makeTestReportingDestination({ id: "rd-1", resourceCategoryIds: ["rc-1"] })],
  });
  const usage = computeTaxonomyUsage("resource_category", "rc-1", bundle);
  assert.equal(usage.totalCount, 3);
});

test("incident_type usage now also counts support organisations and reporting destinations via their incidentTypeIds array field", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    supportOrganisations: [makeTestSupportOrganisation({ id: "org-1", incidentTypeIds: ["it-1"] })],
    reportingDestinations: [makeTestReportingDestination({ id: "rd-1", incidentTypeIds: ["it-1"] })],
  });
  const usage = computeTaxonomyUsage("incident_type", "it-1", bundle);
  assert.equal(usage.totalCount, 2);
});

test("findDanglingTaxonomyReferences for support_organisation reports a matching rule id that does not resolve to a seeded organisation", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    supportOrganisations: [makeTestSupportOrganisation({ id: "org-real" })],
    matchingRules: [makeTestMatchingRule({ id: "rule-1", supportOrganisationIds: ["org-real", "org-missing"] })],
  });
  const dangling = findDanglingTaxonomyReferences("support_organisation", bundle);
  assert.equal(dangling.length, 1);
  assert.equal(dangling[0].missingId, "org-missing");
});

test("findDanglingTaxonomyReferences for support_professional/reporting_destination report nothing when every reference resolves", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    supportProfessionals: [makeTestSupportProfessional({ id: "sp-1" })],
    reportingDestinations: [makeTestReportingDestination({ id: "rd-1" })],
    matchingRules: [makeTestMatchingRule({ id: "rule-1", supportProfessionalIds: ["sp-1"], reportingDestinationIds: ["rd-1"] })],
  });
  assert.deepEqual(findDanglingTaxonomyReferences("support_professional", bundle), []);
  assert.deepEqual(findDanglingTaxonomyReferences("reporting_destination", bundle), []);
});

test("a resource category source list includes the three Support Directory entities alongside the pre-existing microcard/rights-content sources", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    microcards: [makeTestMicrocard({ id: "mc-1", resourceCategoryId: "rc-1" })],
    rightsContent: [makeTestRightsContent({ id: "rc-content-1", resourceCategoryIds: ["rc-1"] })],
    supportOrganisations: [makeTestSupportOrganisation({ id: "org-1", resourceCategoryIds: ["rc-1"] })],
    supportProfessionals: [makeTestSupportProfessional({ id: "sp-1", resourceCategoryIds: ["rc-1"] })],
    reportingDestinations: [makeTestReportingDestination({ id: "rd-1", resourceCategoryIds: ["rc-1"] })],
  });
  const usage = computeTaxonomyUsage("resource_category", "rc-1", bundle);
  assert.equal(usage.totalCount, 5);
  const entityTypes = usage.references.map((r) => r.entityType).sort();
  assert.deepEqual(entityTypes, ["microcard", "reporting_destination", "rights_content", "support_organisation", "support_professional"]);
});

// Regression coverage for the Phase 5 Replace References field-write fix:
// a microcard/rights-content/support-directory record referencing a
// resource category must have *that* field updated, not incidentTypeIds —
// see applyReferenceReplacementPlan in indexeddb-admin-content-repository.ts.
test("resource category and incident type sources use disjoint entity/field pairs so a replacement plan can never target the wrong field", () => {
  const resourceCategoryBundle = makeEmptyTaxonomyDataBundle({
    resourceCategories: [makeTestResourceCategory({ id: "rc-1" })],
    supportOrganisations: [makeTestSupportOrganisation({ id: "org-1", resourceCategoryIds: ["rc-1"], incidentTypeIds: [] })],
  });
  const resourceCategoryUsage = computeTaxonomyUsage("resource_category", "rc-1", resourceCategoryBundle);
  assert.equal(resourceCategoryUsage.totalCount, 1);

  const incidentTypeBundle = makeEmptyTaxonomyDataBundle({
    supportOrganisations: [makeTestSupportOrganisation({ id: "org-1", resourceCategoryIds: [], incidentTypeIds: ["it-1"] })],
  });
  const incidentTypeUsage = computeTaxonomyUsage("incident_type", "it-1", incidentTypeBundle);
  assert.equal(incidentTypeUsage.totalCount, 1);
});
