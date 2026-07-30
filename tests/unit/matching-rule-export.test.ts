import assert from "node:assert/strict";
import test from "node:test";

import { toPublishedMatchingRuleExport } from "../../src/lib/matching-rules/export-transform";
import { makeTestMatchingRule } from "./helpers/matching-rule-fixture";

test("toPublishedMatchingRuleExport strips internalNotes, createdBy, and updatedBy", () => {
  const record = makeTestMatchingRule({ internalNotes: "Admin-only note.", createdBy: "someone", updatedBy: "someone-else" });
  const exported = toPublishedMatchingRuleExport(record) as unknown as Record<string, unknown>;
  assert.equal(exported.internalNotes, undefined);
  assert.equal(exported.createdBy, undefined);
  assert.equal(exported.updatedBy, undefined);
  assert.ok(!("internalNotes" in exported));
  assert.ok(!("createdBy" in exported));
  assert.ok(!("updatedBy" in exported));
});

test("toPublishedMatchingRuleExport keeps every public field", () => {
  const record = makeTestMatchingRule({
    name: "Public Rule",
    machineKey: "public_rule",
    description: "Public description.",
    priority: 3,
    enabled: false,
    topicKeys: ["general_assistant"],
    jurisdictions: ["nsw"],
    urgencyLevels: ["high"],
    supportNeeds: ["housing"],
    publishedDate: "2026-06-01T09:00:00.000Z",
  });
  const exported = toPublishedMatchingRuleExport(record);

  assert.equal(exported.id, record.id);
  assert.equal(exported.name, "Public Rule");
  assert.equal(exported.machineKey, "public_rule");
  assert.equal(exported.description, "Public description.");
  assert.equal(exported.priority, 3);
  assert.equal(exported.enabled, false);
  assert.deepEqual(exported.topicKeys, ["general_assistant"]);
  assert.deepEqual(exported.jurisdictions, ["nsw"]);
  assert.deepEqual(exported.urgencyLevels, ["high"]);
  assert.deepEqual(exported.supportNeeds, ["housing"]);
  assert.deepEqual(exported.incidentTypeIds, record.incidentTypeIds);
  assert.deepEqual(exported.microcardIds, record.microcardIds);
  assert.deepEqual(exported.rightsContentIds, record.rightsContentIds);
  assert.deepEqual(exported.supportOrganisationIds, record.supportOrganisationIds);
  assert.deepEqual(exported.supportProfessionalIds, record.supportProfessionalIds);
  assert.deepEqual(exported.reportingDestinationIds, record.reportingDestinationIds);
  assert.deepEqual(exported.legislationIds, record.legislationIds);
  assert.equal(exported.publishedDate, "2026-06-01T09:00:00.000Z");
  assert.equal(exported.status, record.status);
  assert.equal(exported.isDemo, record.isDemo);
  assert.equal(exported.version, record.version);
});
