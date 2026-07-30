import assert from "node:assert/strict";
import test from "node:test";

import {
  seedDocuments,
  seedIncidentTypes,
  seedMatchingRules,
  seedMicrocards,
  seedReportingDestinations,
  seedResourceCategories,
  seedRightsContent,
  seedSupportOrganisations,
  seedSupportProfessionals,
  seedTriageLabels,
} from "../../src/lib/db/seed";
import { matchingRuleSchema } from "../../src/lib/models/matching-rule";
import { getMatchingRuleBlockers, type MatchingRuleEligibilityContext } from "../../src/lib/matching-rules/eligibility";

test("every seeded matching rule parses against matchingRuleSchema", () => {
  for (const rule of seedMatchingRules) {
    assert.doesNotThrow(() => matchingRuleSchema.parse(rule), `matching rule "${rule.id}" failed to parse`);
  }
});

test("seeded matching rule machine keys are unique and valid", () => {
  const keys = seedMatchingRules.map((r) => r.machineKey);
  assert.equal(new Set(keys).size, keys.length, "machine keys must be unique");
  for (const rule of seedMatchingRules) {
    assert.match(rule.machineKey, /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/, `"${rule.machineKey}" is not a valid machine key`);
  }
});

test("seeded matching rule ids are unique", () => {
  const ids = seedMatchingRules.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every published seeded matching rule has zero blockers against the full seed dataset", () => {
  const context: MatchingRuleEligibilityContext = {
    incidentTypes: seedIncidentTypes,
    triageLabels: seedTriageLabels,
    resourceCategories: seedResourceCategories,
    microcards: seedMicrocards,
    rightsContent: seedRightsContent,
    supportOrganisations: seedSupportOrganisations,
    supportProfessionals: seedSupportProfessionals,
    reportingDestinations: seedReportingDestinations,
    documents: seedDocuments,
  };

  for (const rule of seedMatchingRules) {
    if (rule.status !== "published") continue;
    const blockers = getMatchingRuleBlockers(rule, context);
    assert.deepEqual(blockers, [], `published matching rule "${rule.id}" has blockers: ${blockers.join("; ")}`);
  }
});

test("the deliberately-broken-relationship seeded matching rule stays a draft", () => {
  const context: MatchingRuleEligibilityContext = {
    incidentTypes: seedIncidentTypes,
    triageLabels: seedTriageLabels,
    resourceCategories: seedResourceCategories,
    microcards: seedMicrocards,
    rightsContent: seedRightsContent,
    supportOrganisations: seedSupportOrganisations,
    supportProfessionals: seedSupportProfessionals,
    reportingDestinations: seedReportingDestinations,
    documents: seedDocuments,
  };

  const brokenRules = seedMatchingRules.filter((rule) => getMatchingRuleBlockers(rule, context).some((b) => /no longer exist/i.test(b)));
  assert.ok(brokenRules.length > 0, "expected at least one seeded matching rule with a dangling reference");
  for (const rule of brokenRules) {
    assert.equal(rule.status, "draft", `"${rule.id}" has a dangling reference but is not a draft`);
  }
});

test("every Assistant Topic key appears on at least one seeded matching rule", () => {
  const seenTopics = new Set(seedMatchingRules.flatMap((r) => r.topicKeys));
  for (const topic of ["general_assistant", "domestic_violence", "racial_abuse", "cyber_scam", "migrant_challenges"] as const) {
    assert.ok(seenTopics.has(topic), `no seeded matching rule references topic "${topic}"`);
  }
});

test("at least one seeded matching rule is jurisdiction-specific and at least one is Australia-wide", () => {
  assert.ok(seedMatchingRules.some((r) => r.jurisdictions.length > 0));
  assert.ok(seedMatchingRules.some((r) => r.status === "published" && r.jurisdictions.length === 0));
});

test("at least one seeded matching rule uses every recommendation type at once", () => {
  const hasFullSpread = seedMatchingRules.some(
    (r) =>
      r.microcardIds.length > 0 &&
      r.rightsContentIds.length > 0 &&
      r.supportOrganisationIds.length > 0 &&
      r.supportProfessionalIds.length > 0 &&
      r.reportingDestinationIds.length > 0
  );
  assert.ok(hasFullSpread);
});

test("at least one published matching rule is enabled and at least one is disabled", () => {
  const published = seedMatchingRules.filter((r) => r.status === "published");
  assert.ok(published.some((r) => r.enabled));
  assert.ok(published.some((r) => !r.enabled));
});
