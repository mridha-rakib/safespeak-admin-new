import assert from "node:assert/strict";
import test from "node:test";

import {
  PUBLIC_CONTRACT_PURPOSE,
  PUBLIC_CONTRACT_SCHEMA_VERSION,
  publishedMatchingRuleSchema,
  publishedMicrocardSchema,
  publishedMockContentBundleSchema,
} from "../../src/lib/contract/published-content-contract";

test("a minimal valid microcard passes the contract schema", () => {
  const result = publishedMicrocardSchema.safeParse({
    id: "mc-1",
    status: "published",
    isDemo: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
    title: "Title",
    summary: "Summary",
    tags: [],
    incidentTypeIds: [],
    priority: "normal",
    displayOrder: 0,
    relatedLegislationIds: [],
    relatedSupportOrganisationIds: [],
    cta: { type: "none" },
  });
  assert.equal(result.success, true);
});

test("an invalid jurisdiction value is rejected", () => {
  const result = publishedMicrocardSchema.safeParse({
    id: "mc-1",
    status: "published",
    isDemo: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
    title: "Title",
    summary: "Summary",
    tags: [],
    incidentTypeIds: [],
    jurisdiction: "not-a-real-jurisdiction",
    priority: "normal",
    displayOrder: 0,
    relatedLegislationIds: [],
    relatedSupportOrganisationIds: [],
    cta: { type: "none" },
  });
  assert.equal(result.success, false);
});

test("a matching rule with an enabled: false still validates (preserved, not stripped)", () => {
  const result = publishedMatchingRuleSchema.safeParse({
    id: "rule-1",
    status: "published",
    isDemo: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
    name: "A rule",
    priority: 1,
    enabled: false,
  });
  assert.equal(result.success, true);
  assert.equal(result.data?.enabled, false);
});

test("a matching rule's array condition/recommendation fields default to empty arrays when omitted", () => {
  const result = publishedMatchingRuleSchema.parse({
    id: "rule-1",
    status: "published",
    isDemo: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
    name: "A rule",
    priority: 1,
    enabled: true,
  });
  assert.deepEqual(result.topicKeys, []);
  assert.deepEqual(result.microcardIds, []);
  assert.deepEqual(result.jurisdictions, []);
});

test("the whole-bundle schema rejects a bundle missing a required domain", () => {
  const result = publishedMockContentBundleSchema.safeParse({
    manifest: {
      schemaVersion: PUBLIC_CONTRACT_SCHEMA_VERSION,
      purpose: PUBLIC_CONTRACT_PURPOSE,
      generatedAt: "2026-01-01T00:00:00.000Z",
      sourceApplication: "safespeak-admin",
      recordCounts: {},
      warnings: [],
    },
    data: {
      incidentTypes: [],
      // triageLabels intentionally missing
      resourceCategories: [],
      legislationSources: [],
      microcards: [],
      rightsContent: [],
      supportOrganisations: [],
      supportProfessionals: [],
      reportingDestinations: [],
      matchingRules: [],
    },
  });
  assert.equal(result.success, false);
});

test("the manifest rejects an unsupported schema version and a non-published purpose", () => {
  const baseManifest = {
    generatedAt: "2026-01-01T00:00:00.000Z",
    sourceApplication: "safespeak-admin" as const,
    recordCounts: {},
    warnings: [],
  };
  const emptyData = {
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

  const wrongVersion = publishedMockContentBundleSchema.safeParse({
    manifest: { ...baseManifest, schemaVersion: "999.0.0", purpose: PUBLIC_CONTRACT_PURPOSE },
    data: emptyData,
  });
  assert.equal(wrongVersion.success, false);

  const adminBackup = publishedMockContentBundleSchema.safeParse({
    manifest: { ...baseManifest, schemaVersion: PUBLIC_CONTRACT_SCHEMA_VERSION, purpose: "admin_backup" },
    data: emptyData,
  });
  assert.equal(adminBackup.success, false);
});
