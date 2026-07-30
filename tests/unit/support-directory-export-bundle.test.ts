import assert from "node:assert/strict";
import test from "node:test";

import { buildContentBundle } from "../../src/lib/bundle/export-bundle";
import type { AdminContentRepository } from "../../src/lib/repositories/admin-content-repository";
import { makeTestMatchingRule, makeTestReportingDestination, makeTestSupportOrganisation, makeTestSupportProfessional } from "./helpers/taxonomy-data-bundle-fixture";

/** Mirrors tests/unit/content-export-bundle.test.ts's fake repository. */
function makeFakeRepository(
  overrides: Partial<Record<keyof AdminContentRepository, { list: () => Promise<unknown[]> } & Record<string, unknown>>> = {}
): AdminContentRepository {
  const empty = async () => [];
  const fake = {
    documents: { list: empty },
    documentChunks: { listForDocument: async () => [] },
    microcards: { list: empty },
    rightsContent: { list: empty },
    supportOrganisations: { list: empty },
    supportProfessionals: { list: empty, getProfileImage: async () => undefined },
    reportingDestinations: { list: empty },
    incidentTypes: { list: empty },
    triageLabels: { list: empty },
    resourceCategories: { list: empty },
    matchingRules: { list: empty },
    ...overrides,
  };
  return fake as unknown as AdminContentRepository;
}

const publishedOrganisation = makeTestSupportOrganisation({
  id: "org-published",
  status: "published",
  isDemo: true,
  name: "Published Org",
  verificationStatus: "not_verified",
  verificationNotes: "Internal: pending follow-up call.",
  internalNotes: "Internal: needs a new photo.",
});

const draftOrganisation = makeTestSupportOrganisation({ id: "org-draft", status: "draft", isDemo: true, name: "Draft Org" });

const publishedProfessionalUnverified = makeTestSupportProfessional({
  id: "sp-published-unverified",
  status: "published",
  isDemo: true,
  fullName: "Published Unverified Professional",
  verificationStatus: "not_verified",
  verificationNotes: "Internal note.",
  internalReviewNotes: "Internal review note.",
});

const publishedDestination = makeTestReportingDestination({
  id: "rd-published",
  status: "published",
  isDemo: true,
  name: "Published Destination",
  sourceNotes: "Internal: sourced from a fictional demo agency.",
  publicDisclaimer: "This information is general and may vary by jurisdiction.",
});

test("published support organisations are included and preserve id, name, and verificationStatus", async () => {
  const repository = makeFakeRepository({ supportOrganisations: { list: async () => [publishedOrganisation] } });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  assert.equal(bundle.manifest.recordCounts.supportOrganisations, 1);
  const [record] = bundle.data.supportOrganisations as { id: string; name: string; verificationStatus: string }[];
  assert.equal(record.id, "org-published");
  assert.equal(record.name, "Published Org");
  // A Published but Not Verified organisation must remain visibly Not Verified — never silently upgraded.
  assert.equal(record.verificationStatus, "not_verified");
});

test("draft support organisations are excluded from the Published Content Bundle but included in Admin Backup", async () => {
  const repository = makeFakeRepository({ supportOrganisations: { list: async () => [publishedOrganisation, draftOrganisation] } });

  const published = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });
  assert.equal(published.manifest.recordCounts.supportOrganisations, 1);

  const backup = await buildContentBundle(repository, { purpose: "admin_backup", includeDemoData: true });
  assert.equal(backup.manifest.recordCounts.supportOrganisations, 2);
});

test("verification notes and internal notes are stripped from support organisations in the Published Content Bundle but kept in Admin Backup", async () => {
  const repository = makeFakeRepository({ supportOrganisations: { list: async () => [publishedOrganisation] } });

  const published = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });
  const publishedSerialized = JSON.stringify(published.data.supportOrganisations);
  assert.doesNotMatch(publishedSerialized, /pending follow-up call/);
  assert.doesNotMatch(publishedSerialized, /needs a new photo/);

  const backup = await buildContentBundle(repository, { purpose: "admin_backup", includeDemoData: true });
  const backupSerialized = JSON.stringify(backup.data.supportOrganisations);
  assert.match(backupSerialized, /pending follow-up call/);
  assert.match(backupSerialized, /needs a new photo/);
});

test("a published but not-verified professional remains included and preserves verificationStatus", async () => {
  const repository = makeFakeRepository({ supportProfessionals: { list: async () => [publishedProfessionalUnverified], getProfileImage: async () => undefined } });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  assert.equal(bundle.manifest.recordCounts.supportProfessionals, 1);
  const [record] = bundle.data.supportProfessionals as { verificationStatus: string }[];
  assert.equal(record.verificationStatus, "not_verified");
});

test("verification and internal review notes are stripped from professionals in the Published Content Bundle", async () => {
  const repository = makeFakeRepository({ supportProfessionals: { list: async () => [publishedProfessionalUnverified], getProfileImage: async () => undefined } });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  const serialized = JSON.stringify(bundle.data.supportProfessionals);
  assert.doesNotMatch(serialized, /Internal note/);
  assert.doesNotMatch(serialized, /Internal review note/);
});

test("a manifest warning is produced when a published professional has a profile image, pointing to the ZIP export", async () => {
  const withImage = makeTestSupportProfessional({
    id: "sp-with-image",
    status: "published",
    isDemo: true,
    profilePhoto: { fileName: "demo.jpg", fileSizeBytes: 1024, fileType: "image/jpeg" },
  });
  const repository = makeFakeRepository({ supportProfessionals: { list: async () => [withImage], getProfileImage: async () => undefined } });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  assert.ok(bundle.manifest.warnings.some((w) => /uploaded image/i.test(w) && /ZIP export/i.test(w)));
});

test("published reporting destinations are included and the public disclaimer is preserved verbatim", async () => {
  const repository = makeFakeRepository({ reportingDestinations: { list: async () => [publishedDestination] } });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  assert.equal(bundle.manifest.recordCounts.reportingDestinations, 1);
  const [record] = bundle.data.reportingDestinations as { publicDisclaimer?: string }[];
  assert.equal(record.publicDisclaimer, "This information is general and may vary by jurisdiction.");
});

test("source notes are stripped from reporting destinations in the Published Content Bundle but kept in Admin Backup", async () => {
  const repository = makeFakeRepository({ reportingDestinations: { list: async () => [publishedDestination] } });

  const published = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });
  assert.doesNotMatch(JSON.stringify(published.data.reportingDestinations), /sourced from a fictional demo agency/);

  const backup = await buildContentBundle(repository, { purpose: "admin_backup", includeDemoData: true });
  assert.match(JSON.stringify(backup.data.reportingDestinations), /sourced from a fictional demo agency/);
});

test("a matching rule referencing a support organisation excluded from the export produces a dangling-reference warning", async () => {
  const repository = makeFakeRepository({
    supportOrganisations: { list: async () => [draftOrganisation] },
    matchingRules: { list: async () => [makeTestMatchingRule({ id: "rule-1", supportOrganisationIds: ["org-draft"] })] },
  });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: true });

  assert.ok(bundle.manifest.warnings.some((w) => /references a support organisation that is not included in this export/i.test(w)));
});

test("demo Support Directory records are excluded from the export when includeDemoData is false", async () => {
  const repository = makeFakeRepository({
    supportOrganisations: { list: async () => [publishedOrganisation] },
    supportProfessionals: { list: async () => [publishedProfessionalUnverified], getProfileImage: async () => undefined },
    reportingDestinations: { list: async () => [publishedDestination] },
  });
  const bundle = await buildContentBundle(repository, { purpose: "published_content", includeDemoData: false });

  assert.equal(bundle.manifest.recordCounts.supportOrganisations, 0);
  assert.equal(bundle.manifest.recordCounts.supportProfessionals, 0);
  assert.equal(bundle.manifest.recordCounts.reportingDestinations, 0);
});
