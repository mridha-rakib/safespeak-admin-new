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
import { findDanglingTaxonomyReferences, type TaxonomyDataBundle } from "../../src/lib/taxonomy/dependency-service";
import { isValidMachineKey } from "../../src/lib/taxonomy/machine-key";

const TAXONOMY_COLLECTIONS = [
  { label: "incident types", records: seedIncidentTypes },
  { label: "triage labels", records: seedTriageLabels },
  { label: "resource categories", records: seedResourceCategories },
];

test("every seed taxonomy record has a valid, non-empty machine key", () => {
  for (const { label, records } of TAXONOMY_COLLECTIONS) {
    for (const record of records) {
      assert.ok(isValidMachineKey(record.machineKey), `${label}: "${record.machineKey}" (${record.id}) should be a valid machine key`);
    }
  }
});

test("machine keys are unique within each taxonomy entity type", () => {
  for (const { label, records } of TAXONOMY_COLLECTIONS) {
    const keys = records.map((r) => r.machineKey);
    assert.equal(new Set(keys).size, keys.length, `${label}: machine keys must be unique`);
  }
});

test("seed taxonomy data exercises every content status at least once, per entity", () => {
  for (const { label, records } of TAXONOMY_COLLECTIONS) {
    const statuses = new Set(records.map((r) => r.status));
    assert.ok(statuses.has("published"), `${label}: expected at least one published record`);
    assert.ok(statuses.size > 1, `${label}: expected more than one distinct status among seed records`);
  }
});

test("seed incident types never claim a final urgency decision by default", () => {
  for (const record of seedIncidentTypes) {
    assert.notEqual(record.defaultUrgency, undefined);
  }
});

test("seed triage labels never leave labelGroup unset", () => {
  for (const record of seedTriageLabels) {
    assert.ok(record.labelGroup, `${record.id} should have a labelGroup`);
  }
});

test("seed resource category icon/accent choices are limited to the curated enums, not arbitrary values", () => {
  const validIcons = new Set([
    "safety",
    "legal",
    "mental_health",
    "housing",
    "financial",
    "discrimination",
    "workplace",
    "children",
    "emergency",
    "general",
  ]);
  const validAccents = new Set(["primary", "success", "warning", "destructive", "neutral"]);

  for (const record of seedResourceCategories) {
    if (record.iconKey) assert.ok(validIcons.has(record.iconKey), `unexpected iconKey "${record.iconKey}" on ${record.id}`);
    if (record.accentToken) assert.ok(validAccents.has(record.accentToken), `unexpected accentToken "${record.accentToken}" on ${record.id}`);
  }
});

test("the full seed dataset has no dangling taxonomy references — every seeded id it points to actually exists", () => {
  const bundle: TaxonomyDataBundle = {
    documents: seedDocuments,
    microcards: seedMicrocards,
    rightsContent: seedRightsContent,
    supportOrganisations: seedSupportOrganisations,
    supportProfessionals: seedSupportProfessionals,
    reportingDestinations: seedReportingDestinations,
    matchingRules: seedMatchingRules,
    incidentTypes: seedIncidentTypes,
    triageLabels: seedTriageLabels,
    resourceCategories: seedResourceCategories,
  };

  for (const kind of ["incident_type", "triage_label", "resource_category"] as const) {
    assert.deepEqual(findDanglingTaxonomyReferences(kind, bundle), [], `unexpected dangling ${kind} reference(s) in seed data`);
  }
});
