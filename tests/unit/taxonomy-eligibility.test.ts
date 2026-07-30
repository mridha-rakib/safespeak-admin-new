import assert from "node:assert/strict";
import test from "node:test";

import { getIncidentTypeBlockers, getResourceCategoryBlockers, getTriageLabelBlockers } from "../../src/lib/taxonomy/eligibility";
import { makeTestIncidentType, makeTestResourceCategory, makeTestTriageLabel } from "./helpers/taxonomy-fixture";

test("a fully-eligible incident type has no publish blockers", () => {
  assert.deepEqual(getIncidentTypeBlockers(makeTestIncidentType(), []), []);
});

test("incident type publish is blocked without a name, without a valid machine key, or without a description", () => {
  assert.ok(getIncidentTypeBlockers(makeTestIncidentType({ name: "" }), []).length > 0);
  assert.ok(getIncidentTypeBlockers(makeTestIncidentType({ machineKey: "Not Valid" }), []).length > 0);
  assert.ok(getIncidentTypeBlockers(makeTestIncidentType({ description: "" }), []).length > 0);
});

test("incident type publish is blocked by a duplicate machine key among other records, not itself", () => {
  const existing = [makeTestIncidentType({ id: "other", machineKey: "test_incident_type" })];
  const self = makeTestIncidentType({ id: "self", machineKey: "test_incident_type" });
  assert.ok(getIncidentTypeBlockers(self, existing).some((b) => /already used/.test(b)));
  assert.deepEqual(getIncidentTypeBlockers(self, []), []);
});

test("incident type publish is blocked by a negative display order", () => {
  assert.ok(getIncidentTypeBlockers(makeTestIncidentType({ displayOrder: -1 }), []).length > 0);
});

test("a fully-eligible triage label has no publish blockers", () => {
  assert.deepEqual(getTriageLabelBlockers(makeTestTriageLabel(), []), []);
});

test("triage label publish requires a label group", () => {
  const withoutGroup = makeTestTriageLabel();
  // @ts-expect-error deliberately simulating a missing enum value at the boundary
  withoutGroup.labelGroup = undefined;
  assert.ok(getTriageLabelBlockers(withoutGroup, []).some((b) => /label group/i.test(b)));
});

test("a fully-eligible resource category has no publish blockers", () => {
  assert.deepEqual(getResourceCategoryBlockers(makeTestResourceCategory(), []), []);
});

test("resource category publish requires name, valid machine key, and description", () => {
  assert.ok(getResourceCategoryBlockers(makeTestResourceCategory({ name: "" }), []).length > 0);
  assert.ok(getResourceCategoryBlockers(makeTestResourceCategory({ machineKey: "" }), []).length > 0);
  assert.ok(getResourceCategoryBlockers(makeTestResourceCategory({ description: "" }), []).length > 0);
});
