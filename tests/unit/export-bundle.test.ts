import assert from "node:assert/strict";
import test from "node:test";

import { buildContentBundle } from "../../src/lib/bundle/export-bundle";
import { BUNDLE_SCHEMA_VERSION } from "../../src/lib/models/content-bundle";
import type { AdminContentRepository } from "../../src/lib/repositories/admin-content-repository";
import { makeTestDocument } from "./helpers/document-fixture";

/**
 * A minimal fake conforming to the parts of AdminContentRepository that
 * buildContentBundle actually reads. Cast at the boundary rather than
 * implementing every unrelated method — this test exercises the pure
 * export logic, not the Dexie-backed implementation.
 */
function makeFakeRepository(documents: ReturnType<typeof makeTestDocument>[]): AdminContentRepository {
  const empty = async () => [];
  const fake = {
    documents: { list: async () => documents },
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

const publishedDemo = makeTestDocument({
  id: "doc-published-demo",
  isDemo: true,
  status: "published",
  title: "Demo Act Summary",
});

const draftReal = makeTestDocument({
  id: "doc-draft-real",
  isDemo: false,
  status: "draft",
  title: "Real Uploaded Draft Policy",
});

const archivedReal = makeTestDocument({
  id: "doc-archived-real",
  isDemo: false,
  status: "archived",
  title: "Real Archived Circular",
});

const publishedAiDisabled = makeTestDocument({
  id: "doc-published-ai-disabled",
  isDemo: false,
  status: "published",
  aiUsagePermission: false,
  title: "Published But AI-Disabled Guidance",
});

const publishedLegalReviewIncomplete = makeTestDocument({
  id: "doc-legal-review-incomplete",
  isDemo: false,
  status: "published",
  legalReviewComplete: false,
  title: "Published With Incomplete Legal Review",
  reviewNotes: "Internal note: still awaiting sign-off from legal.",
});

test("published_content bundle manifest carries the current schema version, purpose, and source application", async () => {
  const repository = makeFakeRepository([publishedDemo]);
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  assert.equal(bundle.manifest.schemaVersion, BUNDLE_SCHEMA_VERSION);
  assert.equal(bundle.manifest.purpose, "published_content");
  assert.equal(bundle.manifest.sourceApplication, "safespeak-admin");
  assert.equal(bundle.manifest.format, "json");
  assert.deepEqual(bundle.manifest.includedStatuses, ["published"]);
});

test("draft legislation is excluded from the Published Content Bundle", async () => {
  const repository = makeFakeRepository([publishedDemo, draftReal]);
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  assert.equal(bundle.manifest.recordCounts.legislation, 1);
  const titles = (bundle.data.legislation as { title: string }[]).map((d) => d.title);
  assert.deepEqual(titles, ["Demo Act Summary"]);
});

test("archived legislation is excluded from the Published Content Bundle", async () => {
  const repository = makeFakeRepository([publishedDemo, archivedReal]);
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  assert.equal(bundle.manifest.recordCounts.legislation, 1);
  const titles = (bundle.data.legislation as { title: string }[]).map((d) => d.title);
  assert.deepEqual(titles, ["Demo Act Summary"]);
});

test("Admin Backup includes drafts and archived records, and is clearly labelled", async () => {
  const repository = makeFakeRepository([publishedDemo, draftReal, archivedReal]);
  const bundle = await buildContentBundle(repository, { purpose: "admin_backup", includeDemoData: true });

  assert.equal(bundle.manifest.recordCounts.legislation, 3);
  assert.equal(bundle.manifest.purpose, "admin_backup");
  assert.ok(bundle.manifest.warnings.some((w) => /not for user-frontend consumption/i.test(w)));
});

test("excluding demo data drops demo records from both data and counts", async () => {
  const repository = makeFakeRepository([publishedDemo, publishedAiDisabled]);
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: false });

  assert.equal(bundle.manifest.recordCounts.legislation, 1);
  assert.equal(bundle.manifest.includesDemoData, false);
  const titles = (bundle.data.legislation as { title: string }[]).map((d) => d.title);
  assert.deepEqual(titles, ["Published But AI-Disabled Guidance"]);
});

test("a published record with AI usage disabled is included but marked not AI-eligible", async () => {
  const repository = makeFakeRepository([publishedAiDisabled]);
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  const [record] = bundle.data.legislation as { aiEligible: boolean; aiUsagePermission: boolean }[];
  assert.equal(record.aiUsagePermission, false);
  assert.equal(record.aiEligible, false);
});

test("a published record with incomplete legal review is included but marked not AI-eligible", async () => {
  const repository = makeFakeRepository([publishedLegalReviewIncomplete]);
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  const [record] = bundle.data.legislation as { aiEligible: boolean }[];
  assert.equal(record.aiEligible, false);
});

test("internal review notes are stripped from the Published Content Bundle", async () => {
  const repository = makeFakeRepository([publishedLegalReviewIncomplete]);
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  const serialized = JSON.stringify(bundle.data.legislation);
  assert.doesNotMatch(serialized, /reviewNotes/);
  assert.doesNotMatch(serialized, /still awaiting sign-off/);
});

test("every domain has a checksum", async () => {
  const repository = makeFakeRepository([publishedDemo]);
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  assert.ok(bundle.manifest.checksums);
  for (const domain of Object.keys(bundle.manifest.recordCounts)) {
    assert.ok(bundle.manifest.checksums?.[domain as keyof typeof bundle.manifest.checksums]);
  }
});

test("exported records never contain a blob URL, a local file path, a fileBlob field, or an object URL", async () => {
  const repository = makeFakeRepository([publishedDemo]);
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });
  const serialized = JSON.stringify(bundle.data);

  assert.doesNotMatch(serialized, /blob:/);
  assert.doesNotMatch(serialized, /[A-Za-z]:\\/);
  assert.doesNotMatch(serialized, /"fileBlob"/);
});

test("an invalid record is excluded with a warning instead of failing the whole export", async () => {
  const repository = makeFakeRepository([publishedDemo]);
  (repository.documents.list as unknown as () => Promise<unknown[]>) = async () => [
    publishedDemo,
    { id: "broken", isDemo: false }, // missing required "title"
  ];

  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  assert.equal(bundle.manifest.recordCounts.legislation, 1);
  assert.ok(bundle.manifest.warnings.some((w) => w.includes("legislation")));
});
