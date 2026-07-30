import assert from "node:assert/strict";
import test from "node:test";

import { getMatchingRuleBlockers } from "../../src/lib/matching-rules/eligibility";
import {
  makeTestMatchingRule,
  makeTestMatchingRuleEligibilityContext,
  makeTestRecommendedMicrocard,
  makeTestRecommendedReportingDestination,
  makeTestRecommendedRightsContent,
  makeTestRecommendedSupportOrganisation,
  makeTestRecommendedSupportProfessional,
  makeTestRecommendedDocument,
} from "./helpers/matching-rule-fixture";

test("a fully-eligible matching rule has no publish blockers", () => {
  assert.deepEqual(getMatchingRuleBlockers(makeTestMatchingRule(), makeTestMatchingRuleEligibilityContext()), []);
});

test("publish is blocked without a name, a valid machine key, or a description", () => {
  const context = makeTestMatchingRuleEligibilityContext();
  assert.ok(getMatchingRuleBlockers(makeTestMatchingRule({ name: "" }), context).length > 0);
  assert.ok(getMatchingRuleBlockers(makeTestMatchingRule({ machineKey: "Not Valid" }), context).length > 0);
  assert.ok(getMatchingRuleBlockers(makeTestMatchingRule({ description: "" }), context).length > 0);
});

test("publish is blocked by a non-integer priority", () => {
  const context = makeTestMatchingRuleEligibilityContext();
  assert.ok(getMatchingRuleBlockers(makeTestMatchingRule({ priority: 1.5 }), context).length > 0);
});

test("publish is blocked without a review due date", () => {
  const context = makeTestMatchingRuleEligibilityContext();
  assert.ok(getMatchingRuleBlockers(makeTestMatchingRule({ reviewDueDate: undefined }), context).some((b) => /review due date/i.test(b)));
});

test("publish is blocked when every match condition is empty", () => {
  const context = makeTestMatchingRuleEligibilityContext();
  const rule = makeTestMatchingRule({
    topicKeys: [],
    incidentTypeIds: [],
    triageLabelIds: [],
    resourceCategoryIds: [],
    jurisdictions: [],
    urgencyLevels: [],
    supportNeeds: [],
  });
  assert.ok(getMatchingRuleBlockers(rule, context).some((b) => /match condition/i.test(b)));
});

test("a topicKeys-only or supportNeeds-only condition satisfies the match-condition requirement", () => {
  const context = makeTestMatchingRuleEligibilityContext();
  const withTopic = makeTestMatchingRule({
    topicKeys: ["general_assistant"],
    incidentTypeIds: [],
    triageLabelIds: [],
    resourceCategoryIds: [],
  });
  assert.ok(!getMatchingRuleBlockers(withTopic, context).some((b) => /match condition/i.test(b)));

  const withSupportNeed = makeTestMatchingRule({
    incidentTypeIds: [],
    triageLabelIds: [],
    resourceCategoryIds: [],
    supportNeeds: ["housing"],
  });
  assert.ok(!getMatchingRuleBlockers(withSupportNeed, context).some((b) => /match condition/i.test(b)));
});

test("publish is blocked when every recommendation is empty", () => {
  const context = makeTestMatchingRuleEligibilityContext();
  const rule = makeTestMatchingRule({
    legislationIds: [],
    microcardIds: [],
    rightsContentIds: [],
    supportOrganisationIds: [],
    supportProfessionalIds: [],
    reportingDestinationIds: [],
  });
  assert.ok(getMatchingRuleBlockers(rule, context).some((b) => /recommendation/i.test(b)));
});

test("a dangling condition reference blocks with a count-based message", () => {
  const context = makeTestMatchingRuleEligibilityContext();
  const rule = makeTestMatchingRule({ incidentTypeIds: ["missing-incident-type"] });
  const blockers = getMatchingRuleBlockers(rule, context);
  assert.ok(blockers.some((b) => /1 incident type/i.test(b)));
});

test("a dangling recommendation reference blocks with a count-based message", () => {
  const context = makeTestMatchingRuleEligibilityContext();
  const rule = makeTestMatchingRule({ microcardIds: ["missing-microcard"] });
  const blockers = getMatchingRuleBlockers(rule, context);
  assert.ok(blockers.some((b) => /1 recommended microcard/i.test(b)));
});

test("a recommendation that resolves to a non-published record blocks, even though it exists", () => {
  const context = makeTestMatchingRuleEligibilityContext({
    microcards: [makeTestRecommendedMicrocard({ status: "draft" })],
  });
  const blockers = getMatchingRuleBlockers(makeTestMatchingRule(), context);
  assert.ok(blockers.some((b) => /not published/i.test(b) && /microcard/i.test(b)));
});

test("every recommendation kind enforces the published-only rule, not just microcards", () => {
  const context = makeTestMatchingRuleEligibilityContext({
    rightsContent: [makeTestRecommendedRightsContent({ status: "ready_for_review" })],
    supportOrganisations: [makeTestRecommendedSupportOrganisation({ status: "draft" })],
    supportProfessionals: [makeTestRecommendedSupportProfessional({ status: "needs_update" })],
    reportingDestinations: [makeTestRecommendedReportingDestination({ status: "archived" })],
    documents: [makeTestRecommendedDocument({ status: "draft" })],
  });
  const blockers = getMatchingRuleBlockers(makeTestMatchingRule(), context);
  assert.ok(blockers.some((b) => /rights content/i.test(b) && /not published/i.test(b)));
  assert.ok(blockers.some((b) => /organisation/i.test(b) && /not published/i.test(b)));
  assert.ok(blockers.some((b) => /professional/i.test(b) && /not published/i.test(b)));
  assert.ok(blockers.some((b) => /reporting destination/i.test(b) && /not published/i.test(b)));
  assert.ok(blockers.some((b) => /legislation source/i.test(b) && /not published/i.test(b)));
});

test("an existing (already-selected) unpublished recommendation still blocks — no grandfathering", () => {
  // Distinct from Microcards' own leniency (an existing relationship to a
  // non-archived-but-unpublished record is allowed to stand there); Matching
  // Rules re-check every existing recommendation on every eligibility pass.
  const context = makeTestMatchingRuleEligibilityContext({
    supportOrganisations: [makeTestRecommendedSupportOrganisation({ status: "needs_update" })],
  });
  const rule = makeTestMatchingRule({ status: "published", version: 3 });
  assert.ok(getMatchingRuleBlockers(rule, context).length > 0);
});

test("a draft/archived condition reference does not block — only a true dangling condition does", () => {
  const context = makeTestMatchingRuleEligibilityContext({
    incidentTypes: [
      // Same id the fixture's default rule references, but not published.
      { ...makeTestMatchingRuleEligibilityContext().incidentTypes[0]!, status: "draft" },
    ],
  });
  const blockers = getMatchingRuleBlockers(makeTestMatchingRule(), context);
  assert.ok(!blockers.some((b) => /incident type/i.test(b)));
});
