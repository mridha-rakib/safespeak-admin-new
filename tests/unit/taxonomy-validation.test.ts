import assert from "node:assert/strict";
import test from "node:test";

import { isDuplicateDisplayName, isDuplicateMachineKey, isValidDisplayOrder } from "../../src/lib/taxonomy/validation";
import { makeTestIncidentType } from "./helpers/taxonomy-fixture";

test("isDuplicateMachineKey is case-insensitive and ignores the excluded id", () => {
  const existing = [makeTestIncidentType({ id: "a", machineKey: "online_harassment" })];
  assert.equal(isDuplicateMachineKey("Online_Harassment", existing), true);
  assert.equal(isDuplicateMachineKey("online_harassment", existing, "a"), false);
  assert.equal(isDuplicateMachineKey("workplace_discrimination", existing), false);
});

test("isDuplicateDisplayName normalizes whitespace and case, and ignores the excluded id", () => {
  const existing = [makeTestIncidentType({ id: "a", name: "Online Harassment" })];
  assert.equal(isDuplicateDisplayName("  online   harassment ", existing), true);
  assert.equal(isDuplicateDisplayName("Online Harassment", existing, "a"), false);
  assert.equal(isDuplicateDisplayName("Workplace Discrimination", existing), false);
});

test("isDuplicateDisplayName treats an empty name as never a duplicate", () => {
  const existing = [makeTestIncidentType({ id: "a", name: "" })];
  assert.equal(isDuplicateDisplayName("", existing), false);
  assert.equal(isDuplicateDisplayName("   ", existing), false);
});

test("isValidDisplayOrder requires a non-negative integer", () => {
  assert.equal(isValidDisplayOrder(0), true);
  assert.equal(isValidDisplayOrder(5), true);
  assert.equal(isValidDisplayOrder(-1), false);
  assert.equal(isValidDisplayOrder(1.5), false);
  assert.equal(isValidDisplayOrder(Number.NaN), false);
});
