import assert from "node:assert/strict";
import test from "node:test";

import { computeTaxonomyUsage, findDanglingTaxonomyReferences, planReferenceReplacement } from "../../src/lib/taxonomy/dependency-service";
import {
  makeEmptyTaxonomyDataBundle,
  makeTestMatchingRule,
  makeTestMicrocard,
  makeTestReferencingDocument,
  makeTestSupportProfessional,
} from "./helpers/taxonomy-data-bundle-fixture";
import { makeTestIncidentType, makeTestResourceCategory } from "./helpers/taxonomy-fixture";

test("computeTaxonomyUsage counts zero references for an unused incident type", () => {
  const incidentType = makeTestIncidentType({ id: "it-1" });
  const bundle = makeEmptyTaxonomyDataBundle({ incidentTypes: [incidentType] });

  const usage = computeTaxonomyUsage("incident_type", "it-1", bundle);
  assert.equal(usage.totalCount, 0);
  assert.deepEqual(usage.references, []);
  assert.deepEqual(usage.byEntityType, []);
});

test("computeTaxonomyUsage finds a document referencing an incident type via the array field", () => {
  const doc = makeTestReferencingDocument({ id: "doc-1", title: "Referencing Document", incidentTypeIds: ["it-1"] });
  const bundle = makeEmptyTaxonomyDataBundle({ documents: [doc] });

  const usage = computeTaxonomyUsage("incident_type", "it-1", bundle);
  assert.equal(usage.totalCount, 1);
  assert.equal(usage.references[0].entityType, "document");
  assert.equal(usage.references[0].recordId, "doc-1");
  assert.equal(usage.references[0].detailHref, "/content/knowledge-legislation/doc-1");
});

test("computeTaxonomyUsage finds a matching rule referencing an incident type via the array field", () => {
  const rule = makeTestMatchingRule({ id: "rule-1", name: "Test Rule", incidentTypeIds: ["it-1"] });
  const bundle = makeEmptyTaxonomyDataBundle({ matchingRules: [rule] });

  const usage = computeTaxonomyUsage("incident_type", "it-1", bundle);
  assert.equal(usage.totalCount, 1);
  assert.equal(usage.references[0].entityType, "matching_rule");
});

test("computeTaxonomyUsage does not count a matching rule whose incidentTypeIds is empty", () => {
  const rule = makeTestMatchingRule({ id: "rule-1", incidentTypeIds: [] });
  const bundle = makeEmptyTaxonomyDataBundle({ matchingRules: [rule] });

  assert.equal(computeTaxonomyUsage("incident_type", "it-1", bundle).totalCount, 0);
});

test("computeTaxonomyUsage groups counts by entity type across multiple referencing domains", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    documents: [makeTestReferencingDocument({ id: "doc-1", incidentTypeIds: ["it-1"] })],
    microcards: [
      makeTestMicrocard({ id: "mc-1", incidentTypeIds: ["it-1"] }),
      makeTestMicrocard({ id: "mc-2", incidentTypeIds: ["it-1"] }),
    ],
  });

  const usage = computeTaxonomyUsage("incident_type", "it-1", bundle);
  assert.equal(usage.totalCount, 3);
  const microcardGroup = usage.byEntityType.find((g) => g.entityType === "microcard");
  assert.equal(microcardGroup?.count, 2);
  const documentGroup = usage.byEntityType.find((g) => g.entityType === "document");
  assert.equal(documentGroup?.count, 1);
});

test("computeTaxonomyUsage for a triage label reads triageLabelIds from support professionals and matching rules", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    supportProfessionals: [makeTestSupportProfessional({ id: "sp-1", triageLabelIds: ["tl-1"] })],
    matchingRules: [makeTestMatchingRule({ id: "rule-1", triageLabelIds: ["tl-1"] })],
  });

  const usage = computeTaxonomyUsage("triage_label", "tl-1", bundle);
  assert.equal(usage.totalCount, 2);
});

test("computeTaxonomyUsage for a resource category only reads incidentTypes.relatedResourceCategoryIds", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    incidentTypes: [makeTestIncidentType({ id: "it-1", relatedResourceCategoryIds: ["rc-1"] })],
  });

  const usage = computeTaxonomyUsage("resource_category", "rc-1", bundle);
  assert.equal(usage.totalCount, 1);
  assert.equal(usage.references[0].entityType, "incident_type");
});

test("findDanglingTaxonomyReferences reports a reference whose target id is not present in the bundle", () => {
  const doc = makeTestReferencingDocument({ id: "doc-1", title: "Orphaned Reference", incidentTypeIds: ["missing-id"] });
  const bundle = makeEmptyTaxonomyDataBundle({ documents: [doc], incidentTypes: [makeTestIncidentType({ id: "it-1" })] });

  const dangling = findDanglingTaxonomyReferences("incident_type", bundle);
  assert.equal(dangling.length, 1);
  assert.equal(dangling[0].missingId, "missing-id");
  assert.equal(dangling[0].recordId, "doc-1");
  assert.equal(dangling[0].taxonomyKind, "incident_type");
});

test("findDanglingTaxonomyReferences reports nothing when every reference resolves within the bundle", () => {
  const doc = makeTestReferencingDocument({ id: "doc-1", incidentTypeIds: ["it-1"] });
  const bundle = makeEmptyTaxonomyDataBundle({ documents: [doc], incidentTypes: [makeTestIncidentType({ id: "it-1" })] });

  assert.deepEqual(findDanglingTaxonomyReferences("incident_type", bundle), []);
});

test("findDanglingTaxonomyReferences ignores empty/unset reference values rather than flagging them", () => {
  const rule = makeTestMatchingRule({ id: "rule-1", incidentTypeIds: [] });
  const bundle = makeEmptyTaxonomyDataBundle({ matchingRules: [rule] });

  assert.deepEqual(findDanglingTaxonomyReferences("incident_type", bundle), []);
});

test("planReferenceReplacement repoints every referencing record's array field, de-duplicated and order-preserved", () => {
  const doc = makeTestReferencingDocument({ id: "doc-1", incidentTypeIds: ["it-1", "it-2"] });
  const bundle = makeEmptyTaxonomyDataBundle({ documents: [doc] });

  const plans = planReferenceReplacement("incident_type", "it-1", "it-3", bundle);
  assert.equal(plans.length, 1);
  assert.deepEqual(plans[0].updatedIds, ["it-3", "it-2"]);
});

test("planReferenceReplacement de-duplicates when the replacement target is already present", () => {
  const doc = makeTestReferencingDocument({ id: "doc-1", incidentTypeIds: ["it-1", "it-2"] });
  const bundle = makeEmptyTaxonomyDataBundle({ documents: [doc] });

  const plans = planReferenceReplacement("incident_type", "it-1", "it-2", bundle);
  assert.equal(plans.length, 1);
  assert.deepEqual(plans[0].updatedIds, ["it-2"]);
});

test("planReferenceReplacement repoints a matching rule's incidentTypeIds array", () => {
  const rule = makeTestMatchingRule({ id: "rule-1", incidentTypeIds: ["it-1"] });
  const bundle = makeEmptyTaxonomyDataBundle({ matchingRules: [rule] });

  const plans = planReferenceReplacement("incident_type", "it-1", "it-2", bundle);
  assert.equal(plans.length, 1);
  assert.deepEqual(plans[0].updatedIds, ["it-2"]);
});

test("planReferenceReplacement produces no plan entries for records that do not reference the source", () => {
  const doc = makeTestReferencingDocument({ id: "doc-1", incidentTypeIds: ["it-9"] });
  const bundle = makeEmptyTaxonomyDataBundle({ documents: [doc] });

  assert.deepEqual(planReferenceReplacement("incident_type", "it-1", "it-2", bundle), []);
});

test("resource category usage/dangling/replacement all operate on incidentTypes.relatedResourceCategoryIds", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    incidentTypes: [makeTestIncidentType({ id: "it-1", relatedResourceCategoryIds: ["rc-1", "rc-missing"] })],
    resourceCategories: [makeTestResourceCategory({ id: "rc-1" })],
  });

  assert.equal(computeTaxonomyUsage("resource_category", "rc-1", bundle).totalCount, 1);
  const dangling = findDanglingTaxonomyReferences("resource_category", bundle);
  assert.equal(dangling.length, 1);
  assert.equal(dangling[0].missingId, "rc-missing");

  const plans = planReferenceReplacement("resource_category", "rc-1", "rc-2", bundle);
  assert.deepEqual(plans[0].updatedIds, ["rc-2", "rc-missing"]);
});

test("triage label reference kinds never leak into incident type usage counting", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    supportProfessionals: [makeTestSupportProfessional({ id: "sp-1", incidentTypeIds: [], triageLabelIds: ["tl-1"] })],
  });

  assert.equal(computeTaxonomyUsage("incident_type", "tl-1", bundle).totalCount, 0);
  assert.equal(computeTaxonomyUsage("triage_label", "tl-1", bundle).totalCount, 1);
});
