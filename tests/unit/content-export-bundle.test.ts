import assert from "node:assert/strict";
import test from "node:test";

import { buildContentBundle } from "../../src/lib/bundle/export-bundle";
import type { AdminContentRepository } from "../../src/lib/repositories/admin-content-repository";
import { makeTestMatchingRule, makeTestMicrocard, makeTestRightsContent } from "./helpers/taxonomy-data-bundle-fixture";

/** Mirrors tests/unit/taxonomy-export-bundle.test.ts's fake repository. */
function makeFakeRepository(overrides: Partial<Record<keyof AdminContentRepository, { list: () => Promise<unknown[]> }>> = {}): AdminContentRepository {
  const empty = async () => [];
  const fake = {
    documents: { list: empty },
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
    ...overrides,
  };
  return fake as unknown as AdminContentRepository;
}

const publishedMicrocard = makeTestMicrocard({
  id: "mc-published",
  status: "published",
  isDemo: true,
  title: "Published Card",
  internalNotes: "Internal: pending photo refresh.",
});

const draftMicrocard = makeTestMicrocard({ id: "mc-draft", status: "draft", isDemo: true, title: "Draft Card" });

const publishedRightsContent = makeTestRightsContent({
  id: "rc-published",
  status: "published",
  isDemo: true,
  title: "Published Rights Record",
  internalNotes: "Internal: legal team sign-off pending review.",
  sourceNotes: "Internal source tracking note.",
  publicDisclaimer: "This is general information only.",
});

test("published microcards are included and preserve id, title, and status", async () => {
  const repository = makeFakeRepository({ microcards: { list: async () => [publishedMicrocard] } });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  assert.equal(bundle.manifest.recordCounts.microcards, 1);
  const [record] = bundle.data.microcards as { id: string; title: string; status: string }[];
  assert.equal(record.id, "mc-published");
  assert.equal(record.title, "Published Card");
  assert.equal(record.status, "published");
});

test("draft microcards are excluded from the Published Content Bundle but included in Admin Backup", async () => {
  const repository = makeFakeRepository({ microcards: { list: async () => [publishedMicrocard, draftMicrocard] } });

  const published = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });
  assert.equal(published.manifest.recordCounts.microcards, 1);

  const backup = await buildContentBundle(repository, { purpose: "admin_backup", includeDemoData: true });
  assert.equal(backup.manifest.recordCounts.microcards, 2);
});

test("internal notes are stripped from microcards in the Published Content Bundle but kept in Admin Backup", async () => {
  const repository = makeFakeRepository({ microcards: { list: async () => [publishedMicrocard] } });

  const published = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });
  assert.doesNotMatch(JSON.stringify(published.data.microcards), /pending photo refresh/);

  const backup = await buildContentBundle(repository, { purpose: "admin_backup", includeDemoData: true });
  assert.match(JSON.stringify(backup.data.microcards), /pending photo refresh/);
});

test("published rights content is included and its public disclaimer is preserved", async () => {
  const repository = makeFakeRepository({ rightsContent: { list: async () => [publishedRightsContent] } });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  assert.equal(bundle.manifest.recordCounts.rightsContent, 1);
  const [record] = bundle.data.rightsContent as { publicDisclaimer?: string }[];
  assert.equal(record.publicDisclaimer, "This is general information only.");
});

test("internal notes and source notes are stripped from rights content in the Published Content Bundle", async () => {
  const repository = makeFakeRepository({ rightsContent: { list: async () => [publishedRightsContent] } });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  const serialized = JSON.stringify(bundle.data.rightsContent);
  assert.doesNotMatch(serialized, /legal team sign-off pending review/);
  assert.doesNotMatch(serialized, /Internal source tracking note/);
});

test("a microcard call-to-action pointing at a rights content record excluded from the export produces a warning", async () => {
  const card = makeTestMicrocard({
    id: "mc-1",
    status: "published",
    isDemo: true,
    title: "Card with a dangling CTA",
    cta: { type: "view_rights_information", target: "rc-draft-not-exported" },
  });
  const draftTarget = makeTestRightsContent({ id: "rc-draft-not-exported", status: "draft", isDemo: true });
  const repository = makeFakeRepository({
    microcards: { list: async () => [card] },
    rightsContent: { list: async () => [draftTarget] },
  });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  assert.ok(bundle.manifest.warnings.some((w) => /call-to-action pointing to a Rights & Legal Information record/i.test(w)));
});

test("a microcard call-to-action pointing at an included, published rights content record produces no warning", async () => {
  const target = makeTestRightsContent({ id: "rc-included", status: "published", isDemo: true });
  const card = makeTestMicrocard({
    id: "mc-1",
    status: "published",
    isDemo: true,
    cta: { type: "view_rights_information", target: "rc-included" },
  });
  const repository = makeFakeRepository({
    microcards: { list: async () => [card] },
    rightsContent: { list: async () => [target] },
  });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  assert.ok(!bundle.manifest.warnings.some((w) => /call-to-action pointing/i.test(w)));
});

test("a matching rule referencing a microcard excluded from the export produces a dangling-reference warning", async () => {
  const repository = makeFakeRepository({
    microcards: { list: async () => [draftMicrocard] },
    matchingRules: { list: async () => [makeTestMatchingRule({ id: "rule-1", microcardIds: ["mc-draft"] })] },
  });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  assert.ok(bundle.manifest.warnings.some((w) => /references a microcard that is not included in this export/i.test(w)));
});

test("demo microcards and rights content are excluded from the export when includeDemoData is false", async () => {
  const repository = makeFakeRepository({
    microcards: { list: async () => [publishedMicrocard] },
    rightsContent: { list: async () => [publishedRightsContent] },
  });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: false });

  assert.equal(bundle.manifest.recordCounts.microcards, 0);
  assert.equal(bundle.manifest.recordCounts.rightsContent, 0);
});

test("Admin Backup warns that it is not the Published Content Bundle", async () => {
  const repository = makeFakeRepository({ microcards: { list: async () => [publishedMicrocard] } });
  const bundle = await buildContentBundle(repository, { purpose: "admin_backup", includeDemoData: true });

  assert.ok(bundle.manifest.warnings.some((w) => /not the Published Content Bundle/i.test(w)));
});
