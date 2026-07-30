import assert from "node:assert/strict";
import test from "node:test";

import { computeTaxonomyUsage, findDanglingTaxonomyReferences } from "../../src/lib/taxonomy/dependency-service";
import { makeEmptyTaxonomyDataBundle, makeTestMatchingRule, makeTestMicrocard, makeTestRightsContent } from "./helpers/taxonomy-data-bundle-fixture";

test("computeTaxonomyUsage for a microcard reads matchingRules.microcardIds only", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    matchingRules: [makeTestMatchingRule({ id: "rule-1", microcardIds: ["mc-1"] })],
  });
  const usage = computeTaxonomyUsage("microcard", "mc-1", bundle);
  assert.equal(usage.totalCount, 1);
  assert.equal(usage.references[0].entityType, "matching_rule");
  assert.equal(usage.references[0].recordId, "rule-1");
});

test("computeTaxonomyUsage for a microcard is zero when no matching rule references it", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    matchingRules: [makeTestMatchingRule({ id: "rule-1", microcardIds: ["mc-other"] })],
  });
  assert.equal(computeTaxonomyUsage("microcard", "mc-1", bundle).totalCount, 0);
});

test("computeTaxonomyUsage for a rights content record reads matchingRules.rightsContentIds only", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    matchingRules: [makeTestMatchingRule({ id: "rule-1", rightsContentIds: ["rc-content-1"] })],
  });
  const usage = computeTaxonomyUsage("rights_content", "rc-content-1", bundle);
  assert.equal(usage.totalCount, 1);
  assert.equal(usage.references[0].entityType, "matching_rule");
});

test("microcard and rights_content usage kinds do not leak into each other", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    matchingRules: [makeTestMatchingRule({ id: "rule-1", microcardIds: ["shared-id"], rightsContentIds: [] })],
  });
  assert.equal(computeTaxonomyUsage("microcard", "shared-id", bundle).totalCount, 1);
  assert.equal(computeTaxonomyUsage("rights_content", "shared-id", bundle).totalCount, 0);
});

test("findDanglingTaxonomyReferences for microcard reports a matching rule id that does not resolve to a seeded microcard", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    microcards: [makeTestMicrocard({ id: "mc-real" })],
    matchingRules: [makeTestMatchingRule({ id: "rule-1", microcardIds: ["mc-real", "mc-missing"] })],
  });
  const dangling = findDanglingTaxonomyReferences("microcard", bundle);
  assert.equal(dangling.length, 1);
  assert.equal(dangling[0].missingId, "mc-missing");
});

test("findDanglingTaxonomyReferences for rights_content reports nothing when every reference resolves", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    rightsContent: [makeTestRightsContent({ id: "rc-content-1" })],
    matchingRules: [makeTestMatchingRule({ id: "rule-1", rightsContentIds: ["rc-content-1"] })],
  });
  assert.deepEqual(findDanglingTaxonomyReferences("rights_content", bundle), []);
});

test("resource_category usage counts a microcard's singular resourceCategoryId and a rights content record's resourceCategoryIds array", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    microcards: [makeTestMicrocard({ id: "mc-1", resourceCategoryId: "rc-1" })],
    rightsContent: [makeTestRightsContent({ id: "rc-content-1", resourceCategoryIds: ["rc-1"] })],
  });
  const usage = computeTaxonomyUsage("resource_category", "rc-1", bundle);
  assert.equal(usage.totalCount, 2);
  const entityTypes = usage.references.map((r) => r.entityType).sort();
  assert.deepEqual(entityTypes, ["microcard", "rights_content"]);
});

test("incident_type usage counts microcards and rights content via their incidentTypeIds array field", () => {
  const bundle = makeEmptyTaxonomyDataBundle({
    microcards: [makeTestMicrocard({ id: "mc-1", incidentTypeIds: ["it-1"] })],
    rightsContent: [makeTestRightsContent({ id: "rc-content-1", incidentTypeIds: ["it-1"] })],
  });
  const usage = computeTaxonomyUsage("incident_type", "it-1", bundle);
  assert.equal(usage.totalCount, 2);
});
