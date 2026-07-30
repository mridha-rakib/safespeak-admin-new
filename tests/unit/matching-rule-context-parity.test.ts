import assert from "node:assert/strict";
import test from "node:test";

import { evaluateRuleTrigger } from "../../src/lib/matching-rules/engine";
import type { MockIncidentContext, PublishedMatchingRule } from "../../src/lib/contract/published-content-contract";
import bundle from "../../src/lib/contract/generated/published-content-bundle.json" with { type: "json" };

/**
 * Phase 6.1 — matching-rule/context parity. For every Published, Enabled
 * matching rule in the generated bundle, proves:
 *  1. A context built to satisfy every one of the rule's own non-empty
 *     condition dimensions actually triggers it (the rule's conditions are
 *     internally consistent and reachable — not a typo/mismatch that could
 *     never fire).
 *  2. A context that differs on the rule's topic (every published rule in
 *     this dataset conditions on `topicKeys`) does NOT trigger it.
 *
 * This is deliberately a data-driven test over whatever the generated
 * bundle actually contains, not a hand-maintained list of rule ids, so a
 * newly seeded rule is automatically covered without a matching new test.
 */

const CONTRACT_ASSISTANT_TOPIC_KEYS = [
  "general_assistant",
  "domestic_violence",
  "racial_abuse",
  "cyber_scam",
  "migrant_challenges",
] as const;

function baseContext(rule: PublishedMatchingRule): MockIncidentContext {
  return {
    assistantTopic: rule.topicKeys[0] ?? "general_assistant",
    incidentTypeIds: [...rule.incidentTypeIds],
    triageLabelIds: [...rule.triageLabelIds],
    jurisdiction: rule.jurisdictions[0],
    urgency: rule.urgencyLevels[0],
    supportNeeds: [...rule.supportNeeds],
    mockScenarioId: `parity-test-${rule.id}`,
    contextVersion: 1,
  };
}

function incompatibleContext(rule: PublishedMatchingRule): MockIncidentContext {
  const otherTopic = CONTRACT_ASSISTANT_TOPIC_KEYS.find((t) => !rule.topicKeys.includes(t)) ?? "general_assistant";
  return {
    ...baseContext(rule),
    assistantTopic: otherTopic,
  };
}

const publishedEnabledRules = (bundle.data.matchingRules as PublishedMatchingRule[]).filter(
  (rule) => rule.status === "published" && rule.enabled
);

test("the generated bundle has at least one Published Enabled matching rule per Assistant topic", () => {
  const topicsCovered = new Set(publishedEnabledRules.flatMap((rule) => rule.topicKeys));
  for (const topic of CONTRACT_ASSISTANT_TOPIC_KEYS) {
    assert.ok(topicsCovered.has(topic), `no Published Enabled rule declares topicKeys including "${topic}"`);
  }
});

test("every Published Enabled matching rule declares a non-empty topicKeys condition", () => {
  // Confirmed true of this dataset — the test vector construction below
  // relies on it (a topic mismatch is used as the universal "clearly
  // incompatible" context). If this ever stops being true for a new rule,
  // the incompatible-context construction needs to change too.
  for (const rule of publishedEnabledRules) {
    assert.ok(rule.topicKeys.length > 0, `"${rule.id}" has no topicKeys condition`);
  }
});

for (const rule of publishedEnabledRules) {
  test(`matching rule "${rule.id}": its own intended scenario triggers it`, () => {
    const { triggered } = evaluateRuleTrigger(rule, baseContext(rule));
    assert.equal(triggered, true, `rule "${rule.id}" did not trigger for a context built from its own conditions`);
  });

  test(`matching rule "${rule.id}": a context with a different topic does not trigger it`, () => {
    const { triggered } = evaluateRuleTrigger(rule, incompatibleContext(rule));
    assert.equal(triggered, false, `rule "${rule.id}" incorrectly triggered for an incompatible-topic context`);
  });
}

test("a Published but Disabled rule is excluded from the Published-Enabled parity set (still present in the bundle, per version-parity policy)", () => {
  const disabledPublished = (bundle.data.matchingRules as PublishedMatchingRule[]).filter(
    (rule) => rule.status === "published" && !rule.enabled
  );
  assert.ok(disabledPublished.length > 0, "expected at least one Published-but-Disabled rule fixture in the bundle");
  for (const rule of disabledPublished) {
    assert.ok(!publishedEnabledRules.some((r) => r.id === rule.id));
  }
});
