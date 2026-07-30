import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateRuleTrigger,
  MATCHING_ENGINE_VERSION,
  RESULT_LIMITS,
  runMockMatching,
  runMockMatchingDebug,
} from "../../src/lib/matching-rules/engine";
import type {
  MockIncidentContext,
  PublishedMatchingRule,
  PublishedMicrocard,
  PublishedMockContentBundle,
} from "../../src/lib/contract/published-content-contract";

function makeContext(overrides: Partial<MockIncidentContext> = {}): MockIncidentContext {
  return {
    assistantTopic: "domestic_violence",
    incidentTypeIds: [],
    triageLabelIds: [],
    supportNeeds: [],
    mockScenarioId: "test-scenario",
    contextVersion: 1,
    ...overrides,
  };
}

function makeRule(overrides: Partial<PublishedMatchingRule> = {}): PublishedMatchingRule {
  return {
    id: "rule-1",
    status: "published",
    isDemo: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
    name: "Test rule",
    priority: 5,
    enabled: true,
    topicKeys: [],
    incidentTypeIds: [],
    triageLabelIds: [],
    resourceCategoryIds: [],
    jurisdictions: [],
    urgencyLevels: [],
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

function makeMicrocard(id: string): PublishedMicrocard {
  return {
    id,
    status: "published",
    isDemo: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
    title: `Microcard ${id}`,
    summary: "Summary",
    tags: [],
    incidentTypeIds: [],
    priority: "normal",
    displayOrder: 0,
    relatedLegislationIds: [],
    relatedSupportOrganisationIds: [],
    cta: { type: "none" },
  };
}

function makeEmptyBundleData(): PublishedMockContentBundle["data"] {
  return {
    incidentTypes: [],
    triageLabels: [],
    resourceCategories: [],
    legislationSources: [],
    microcards: [],
    rightsContent: [],
    supportOrganisations: [],
    supportProfessionals: [],
    reportingDestinations: [],
    matchingRules: [],
  };
}

test("a rule with every condition empty always triggers (general fallback rule)", () => {
  const { triggered } = evaluateRuleTrigger(makeRule(), makeContext());
  assert.equal(triggered, true);
});

test("a topic condition blocks the rule when the context topic doesn't match", () => {
  const rule = makeRule({ topicKeys: ["cyber_scam"] });
  const { triggered } = evaluateRuleTrigger(rule, makeContext({ assistantTopic: "domestic_violence" }));
  assert.equal(triggered, false);
});

test("a topic condition triggers the rule when the context topic matches", () => {
  const rule = makeRule({ topicKeys: ["domestic_violence"] });
  const { triggered } = evaluateRuleTrigger(rule, makeContext({ assistantTopic: "domestic_violence" }));
  assert.equal(triggered, true);
});

test("incident type overlap triggers; no overlap blocks", () => {
  const rule = makeRule({ incidentTypeIds: ["it-1", "it-2"] });
  assert.equal(evaluateRuleTrigger(rule, makeContext({ incidentTypeIds: ["it-2"] })).triggered, true);
  assert.equal(evaluateRuleTrigger(rule, makeContext({ incidentTypeIds: ["it-9"] })).triggered, false);
  assert.equal(evaluateRuleTrigger(rule, makeContext({ incidentTypeIds: [] })).triggered, false);
});

test("triage label overlap triggers; no overlap blocks", () => {
  const rule = makeRule({ triageLabelIds: ["tl-1"] });
  assert.equal(evaluateRuleTrigger(rule, makeContext({ triageLabelIds: ["tl-1"] })).triggered, true);
  assert.equal(evaluateRuleTrigger(rule, makeContext({ triageLabelIds: ["tl-2"] })).triggered, false);
});

test("urgency condition requires an exact context match", () => {
  const rule = makeRule({ urgencyLevels: ["high", "critical"] });
  assert.equal(evaluateRuleTrigger(rule, makeContext({ urgency: "high" })).triggered, true);
  assert.equal(evaluateRuleTrigger(rule, makeContext({ urgency: "low" })).triggered, false);
  assert.equal(evaluateRuleTrigger(rule, makeContext({ urgency: undefined })).triggered, false);
});

test("an empty jurisdictions list is Australia-wide and matches any (or unknown) context jurisdiction", () => {
  const rule = makeRule({ jurisdictions: [] });
  assert.equal(evaluateRuleTrigger(rule, makeContext({ jurisdiction: "nsw" })).triggered, true);
  assert.equal(evaluateRuleTrigger(rule, makeContext({ jurisdiction: undefined })).triggered, true);
});

test("a jurisdiction-specific rule does not trigger for an unknown context jurisdiction", () => {
  const rule = makeRule({ jurisdictions: ["nsw"] });
  assert.equal(evaluateRuleTrigger(rule, makeContext({ jurisdiction: undefined })).triggered, false);
  assert.equal(evaluateRuleTrigger(rule, makeContext({ jurisdiction: "vic" })).triggered, false);
  assert.equal(evaluateRuleTrigger(rule, makeContext({ jurisdiction: "nsw" })).triggered, true);
});

test("support need overlap is case/whitespace-insensitive", () => {
  const rule = makeRule({ supportNeeds: ["Safety Planning"] });
  assert.equal(evaluateRuleTrigger(rule, makeContext({ supportNeeds: ["  safety planning  "] })).triggered, true);
  assert.equal(evaluateRuleTrigger(rule, makeContext({ supportNeeds: ["legal_support"] })).triggered, false);
});

test("only published AND enabled rules execute", () => {
  const data = makeEmptyBundleData();
  data.matchingRules = [
    makeRule({ id: "r-published-enabled", status: "published", enabled: true }),
    makeRule({ id: "r-published-disabled", status: "published", enabled: false }),
    makeRule({ id: "r-draft", status: "draft", enabled: true }),
    makeRule({ id: "r-archived", status: "archived", enabled: true }),
    makeRule({ id: "r-needs-update", status: "needs_update", enabled: true }),
  ];

  const result = runMockMatchingDebug(data, makeContext());
  assert.deepEqual(result.triggeredRuleIds, ["r-published-enabled"]);
});

test("priority ascending wins, then rule id is the deterministic tie-break", () => {
  const data = makeEmptyBundleData();
  data.matchingRules = [
    makeRule({ id: "r-b", priority: 2 }),
    makeRule({ id: "r-a", priority: 2 }),
    makeRule({ id: "r-c", priority: 1 }),
  ];
  const result = runMockMatchingDebug(data, makeContext());
  assert.deepEqual(result.triggeredRuleIds, ["r-c", "r-a", "r-b"]);
});

test("a record recommended by two rules is deduplicated with combined reasons, keeping the higher-priority rule's position", () => {
  const data = makeEmptyBundleData();
  data.microcards = [makeMicrocard("mc-1"), makeMicrocard("mc-2")];
  data.matchingRules = [
    makeRule({ id: "r-1", priority: 1, microcardIds: ["mc-1"] }),
    makeRule({ id: "r-2", priority: 2, microcardIds: ["mc-1", "mc-2"] }),
  ];
  const result = runMockMatching(data, makeContext());
  assert.deepEqual(
    result.recommendations.microcards.map((r) => r.recordId),
    ["mc-1", "mc-2"]
  );
  const mc1 = result.recommendations.microcards.find((r) => r.recordId === "mc-1")!;
  assert.equal(mc1.reasons.some((r) => r.ruleId === "r-1"), true);
  assert.equal(mc1.reasons.some((r) => r.ruleId === "r-2"), true);
});

test("a recommendation id not present in the bundle is excluded, never invented", () => {
  const data = makeEmptyBundleData();
  data.microcards = [makeMicrocard("mc-1")];
  data.matchingRules = [makeRule({ id: "r-1", microcardIds: ["mc-1", "mc-missing"] })];

  const debugResult = runMockMatchingDebug(data, makeContext());
  assert.deepEqual(
    debugResult.recommendations.microcards.map((r) => r.recordId),
    ["mc-1"]
  );
  assert.equal(debugResult.excludedRelationships.length, 1);
  assert.equal(debugResult.excludedRelationships[0]!.recordId, "mc-missing");

  const publicResult = runMockMatching(data, makeContext());
  assert.equal((publicResult as unknown as { excludedRelationships?: unknown }).excludedRelationships, undefined);
});

test("result limits apply per kind after deduplication", () => {
  const data = makeEmptyBundleData();
  const ids = Array.from({ length: RESULT_LIMITS.microcard + 5 }, (_, i) => `mc-${i}`);
  data.microcards = ids.map(makeMicrocard);
  data.matchingRules = [makeRule({ id: "r-1", microcardIds: ids })];

  const result = runMockMatching(data, makeContext());
  assert.equal(result.recommendations.microcards.length, RESULT_LIMITS.microcard);
});

test("matching is deterministic across repeated runs with the same input", () => {
  const data = makeEmptyBundleData();
  data.microcards = [makeMicrocard("mc-1"), makeMicrocard("mc-2")];
  data.matchingRules = [
    makeRule({ id: "r-1", priority: 1, microcardIds: ["mc-2"] }),
    makeRule({ id: "r-2", priority: 2, microcardIds: ["mc-1"] }),
  ];
  const context = makeContext();
  const first = runMockMatching(data, context);
  const second = runMockMatching(data, context);
  assert.deepEqual(first, second);
});

test("the result records the contract schema version and engine version", () => {
  const result = runMockMatching(makeEmptyBundleData(), makeContext());
  assert.equal(result.contractSchemaVersion, "1.0.0");
  assert.equal(result.matchingEngineVersion, MATCHING_ENGINE_VERSION);
});

test("every result kind is present, even when empty", () => {
  const result = runMockMatching(makeEmptyBundleData(), makeContext());
  assert.deepEqual(Object.keys(result.recommendations).sort(), [
    "legislationSources",
    "microcards",
    "reportingDestinations",
    "rightsContent",
    "supportOrganisations",
    "supportProfessionals",
  ]);
});
