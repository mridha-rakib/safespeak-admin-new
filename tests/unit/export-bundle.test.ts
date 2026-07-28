import assert from "node:assert/strict";
import test from "node:test";

import { buildContentBundle } from "../../src/lib/bundle/export-bundle";
import { BUNDLE_SCHEMA_VERSION } from "../../src/lib/models/content-bundle";
import { createBaseFields } from "../../src/lib/models/base";
import type { AdminContentRepository } from "../../src/lib/repositories/admin-content-repository";

const demoDoc = {
  ...createBaseFields({ isDemo: true, status: "published" }),
  title: "Demo Act Summary",
  sourceType: "legislation" as const,
  language: "en",
  licenseStatus: "unknown" as const,
  relevantSections: [],
  tags: [],
  incidentTypeIds: [],
  priority: "medium" as const,
  aiUsagePermission: false,
  legalReviewComplete: true,
  processingStatus: "ready_for_ai_processing" as const,
  extractionStatus: "extracted" as const,
  localPreviewStatus: "available" as const,
};

const realDoc = {
  ...createBaseFields({ isDemo: false, status: "draft" }),
  title: "Real Uploaded Policy",
  sourceType: "policy" as const,
  language: "en",
  licenseStatus: "unknown" as const,
  relevantSections: [],
  tags: [],
  incidentTypeIds: [],
  priority: "medium" as const,
  aiUsagePermission: false,
  legalReviewComplete: false,
  processingStatus: "not_processed" as const,
  extractionStatus: "not_extracted" as const,
  localPreviewStatus: "unavailable" as const,
};

/**
 * A minimal fake conforming to the parts of AdminContentRepository that
 * buildContentBundle actually reads. Cast at the boundary rather than
 * implementing every unrelated method — this test exercises the pure
 * export logic, not the Dexie-backed implementation.
 */
function makeFakeRepository(): AdminContentRepository {
  const empty = async () => [];
  const fake = {
    documents: { list: async () => [demoDoc, realDoc] },
    documentChunks: { listForDocument: async () => [] },
    microcards: { list: empty },
    rightsContent: { list: empty },
    supportOrganisations: { list: empty },
    supportProfessionals: { list: empty },
    reportingDestinations: { list: empty },
    incidentTypes: { list: empty },
    triageLabels: { list: empty },
    resourceCategories: { list: empty },
    matchingRules: { list: empty },
  };
  return fake as unknown as AdminContentRepository;
}

test("bundle manifest carries the current schema version and source application", async () => {
  const repository = makeFakeRepository();
  const bundle = await buildContentBundle(repository, { includeDemoData: true });

  assert.equal(bundle.manifest.schemaVersion, BUNDLE_SCHEMA_VERSION);
  assert.equal(bundle.manifest.sourceApplication, "safespeak-admin");
  assert.equal(bundle.manifest.format, "json");
});

test("record counts reflect exactly what was included", async () => {
  const repository = makeFakeRepository();
  const bundle = await buildContentBundle(repository, { includeDemoData: true });

  assert.equal(bundle.manifest.recordCounts.legislation, 2);
  assert.equal(bundle.data.legislation.length, 2);
});

test("excluding demo data drops demo records from both data and counts", async () => {
  const repository = makeFakeRepository();
  const bundle = await buildContentBundle(repository, { includeDemoData: false });

  assert.equal(bundle.manifest.recordCounts.legislation, 1);
  assert.equal(bundle.manifest.includesDemoData, false);
  const titles = (bundle.data.legislation as { title: string }[]).map((d) => d.title);
  assert.deepEqual(titles, ["Real Uploaded Policy"]);
});

test("every domain has a checksum", async () => {
  const repository = makeFakeRepository();
  const bundle = await buildContentBundle(repository, { includeDemoData: true });

  assert.ok(bundle.manifest.checksums);
  for (const domain of Object.keys(bundle.manifest.recordCounts)) {
    assert.ok(bundle.manifest.checksums?.[domain as keyof typeof bundle.manifest.checksums]);
  }
});

test("exported records never contain a blob URL, a local file path, or a fileBlob field", async () => {
  const repository = makeFakeRepository();
  const bundle = await buildContentBundle(repository, { includeDemoData: true });
  const serialized = JSON.stringify(bundle.data);

  assert.doesNotMatch(serialized, /blob:/);
  assert.doesNotMatch(serialized, /[A-Za-z]:\\/);
  assert.doesNotMatch(serialized, /"fileBlob"/);
});

test("an invalid record is excluded with a warning instead of failing the whole export", async () => {
  const repository = makeFakeRepository();
  (repository.documents.list as unknown as () => Promise<unknown[]>) = async () => [
    demoDoc,
    { id: "broken", isDemo: false }, // missing required "title"
  ];

  const bundle = await buildContentBundle(repository, { includeDemoData: true });

  assert.equal(bundle.manifest.recordCounts.legislation, 1);
  assert.ok(bundle.manifest.warnings.some((w) => w.includes("legislation")));
});
