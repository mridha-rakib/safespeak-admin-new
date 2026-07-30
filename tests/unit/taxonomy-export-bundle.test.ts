import assert from "node:assert/strict";
import test from "node:test";

import { buildContentBundle } from "../../src/lib/bundle/export-bundle";
import type { AdminContentRepository } from "../../src/lib/repositories/admin-content-repository";
import { makeTestDocument } from "./helpers/document-fixture";
import { makeTestIncidentType, makeTestResourceCategory, makeTestTriageLabel } from "./helpers/taxonomy-fixture";

/** Mirrors tests/unit/export-bundle.test.ts's fake repository, extended so taxonomy fixtures can be supplied per test. */
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

const publishedIncidentType = makeTestIncidentType({
  id: "it-published",
  status: "published",
  isDemo: true,
  name: "Online Harassment",
  machineKey: "online_harassment",
  displayOrder: 3,
  adminGuidance: "Internal: escalate to safety team if repeated.",
  internalNotes: "Reviewed by policy team 2026-01-01.",
});

const draftIncidentType = makeTestIncidentType({
  id: "it-draft",
  status: "draft",
  isDemo: true,
  name: "Unreviewed Category",
  machineKey: "unreviewed_category",
});

test("published taxonomy records are included and preserve id, machineKey, displayOrder, and status", async () => {
  const repository = makeFakeRepository({ incidentTypes: { list: async () => [publishedIncidentType] } });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  assert.equal(bundle.manifest.recordCounts.incidentTypes, 1);
  const [record] = bundle.data.incidentTypes as { id: string; machineKey: string; displayOrder: number; status: string }[];
  assert.equal(record.id, "it-published");
  assert.equal(record.machineKey, "online_harassment");
  assert.equal(record.displayOrder, 3);
  assert.equal(record.status, "published");
});

test("draft and ready-for-review taxonomy are excluded from the Published Content Bundle", async () => {
  const repository = makeFakeRepository({
    incidentTypes: { list: async () => [publishedIncidentType, draftIncidentType] },
  });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  assert.equal(bundle.manifest.recordCounts.incidentTypes, 1);
  const ids = (bundle.data.incidentTypes as { id: string }[]).map((r) => r.id);
  assert.deepEqual(ids, ["it-published"]);
});

test("archived taxonomy is excluded from the Published Content Bundle", async () => {
  const archived = makeTestIncidentType({ id: "it-archived", status: "archived", isDemo: true });
  const repository = makeFakeRepository({ incidentTypes: { list: async () => [publishedIncidentType, archived] } });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  assert.equal(bundle.manifest.recordCounts.incidentTypes, 1);
});

test("internal notes and admin guidance are stripped from taxonomy records in the Published Content Bundle", async () => {
  const repository = makeFakeRepository({ incidentTypes: { list: async () => [publishedIncidentType] } });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  const serialized = JSON.stringify(bundle.data.incidentTypes);
  assert.doesNotMatch(serialized, /internalNotes/);
  assert.doesNotMatch(serialized, /Reviewed by policy team/);
  assert.doesNotMatch(serialized, /adminGuidance/);
  assert.doesNotMatch(serialized, /escalate to safety team/);
});

test("triage label internal notes are stripped from the Published Content Bundle", async () => {
  const label = makeTestTriageLabel({
    id: "tl-1",
    status: "published",
    isDemo: true,
    internalNotes: "Internal wording review pending.",
  });
  const repository = makeFakeRepository({ triageLabels: { list: async () => [label] } });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  const serialized = JSON.stringify(bundle.data.triageLabels);
  assert.doesNotMatch(serialized, /internalNotes/);
  assert.doesNotMatch(serialized, /wording review pending/);
});

test("resource category internal notes are stripped from the Published Content Bundle", async () => {
  const category = makeTestResourceCategory({
    id: "rc-1",
    status: "published",
    isDemo: true,
    internalNotes: "Internal: pending icon refresh.",
    iconKey: "safety",
    accentToken: "primary",
  });
  const repository = makeFakeRepository({ resourceCategories: { list: async () => [category] } });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  const serialized = JSON.stringify(bundle.data.resourceCategories);
  assert.doesNotMatch(serialized, /internalNotes/);
  assert.doesNotMatch(serialized, /pending icon refresh/);
  const [record] = bundle.data.resourceCategories as { iconKey?: string; accentToken?: string }[];
  assert.equal(record.iconKey, "safety");
  assert.equal(record.accentToken, "primary");
});

test("Admin Backup keeps every taxonomy status and does not strip internal notes", async () => {
  const archived = makeTestIncidentType({ id: "it-archived", status: "archived", isDemo: true });
  const repository = makeFakeRepository({
    incidentTypes: { list: async () => [publishedIncidentType, draftIncidentType, archived] },
  });
  const bundle = await buildContentBundle(repository, { purpose: "admin_backup", includeDemoData: true });

  assert.equal(bundle.manifest.recordCounts.incidentTypes, 3);
  const serialized = JSON.stringify(bundle.data.incidentTypes);
  assert.match(serialized, /Reviewed by policy team/);
});

test("a published document referencing a non-published incident type produces a dangling-reference warning", async () => {
  const doc = makeTestDocument({
    id: "doc-1",
    status: "published",
    isDemo: true,
    incidentTypeIds: [draftIncidentType.id],
  });
  const repository = makeFakeRepository({
    documents: { list: async () => [doc] },
    incidentTypes: { list: async () => [draftIncidentType] },
  });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  assert.ok(bundle.manifest.warnings.some((w) => /incident type that is not included in this export/.test(w)));
});

test("no dangling-reference warning when the referenced incident type is also published and included", async () => {
  const doc = makeTestDocument({
    id: "doc-1",
    status: "published",
    isDemo: true,
    incidentTypeIds: [publishedIncidentType.id],
  });
  const repository = makeFakeRepository({
    documents: { list: async () => [doc] },
    incidentTypes: { list: async () => [publishedIncidentType] },
  });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  assert.ok(!bundle.manifest.warnings.some((w) => /is not included in this export/.test(w)));
});
