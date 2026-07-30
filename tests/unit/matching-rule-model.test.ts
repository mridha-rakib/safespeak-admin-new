import assert from "node:assert/strict";
import test from "node:test";

import { matchingRuleSchema } from "../../src/lib/models/matching-rule";
import { makeTestMatchingRule } from "./helpers/matching-rule-fixture";

test("matchingRuleSchema parses a valid record and fills in array/boolean defaults", () => {
  const parsed = matchingRuleSchema.parse(makeTestMatchingRule());
  assert.equal(parsed.enabled, true);
  assert.deepEqual(parsed.topicKeys, []);
  assert.deepEqual(parsed.supportNeeds, []);
});

test("matchingRuleSchema rejects a missing id", () => {
  const { id: _id, ...withoutId } = makeTestMatchingRule();
  assert.throws(() => matchingRuleSchema.parse(withoutId));
});

test("matchingRuleSchema rejects an invalid jurisdiction enum value", () => {
  assert.throws(() =>
    matchingRuleSchema.parse(makeTestMatchingRule({ jurisdictions: ["not_a_real_jurisdiction" as never] }))
  );
});

test("matchingRuleSchema rejects an invalid urgency level enum value", () => {
  assert.throws(() => matchingRuleSchema.parse(makeTestMatchingRule({ urgencyLevels: ["extreme" as never] })));
});

test("matchingRuleSchema rejects an invalid assistant topic key", () => {
  assert.throws(() => matchingRuleSchema.parse(makeTestMatchingRule({ topicKeys: ["not_a_real_topic" as never] })));
});

test("matchingRuleSchema requires priority to be an integer", () => {
  assert.throws(() => matchingRuleSchema.parse(makeTestMatchingRule({ priority: 1.5 })));
});
