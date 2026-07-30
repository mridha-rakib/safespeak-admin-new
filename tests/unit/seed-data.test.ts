import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSeedAuditEvents,
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

const ALL_SEED_COLLECTIONS = [
  seedIncidentTypes,
  seedTriageLabels,
  seedResourceCategories,
  seedDocuments,
  seedMicrocards,
  seedRightsContent,
  seedSupportOrganisations,
  seedSupportProfessionals,
  seedReportingDestinations,
  seedMatchingRules,
];

test("every seed record is marked isDemo: true", () => {
  for (const collection of ALL_SEED_COLLECTIONS) {
    for (const record of collection) {
      assert.equal(record.isDemo, true, `${"id" in record ? record.id : "record"} should be demo data`);
    }
  }
});

test("every seed record uses a fixed, non-empty id (deterministic reset)", () => {
  const allIds = ALL_SEED_COLLECTIONS.flat().map((r) => r.id);
  assert.equal(new Set(allIds).size, allIds.length, "seed ids must be unique across the whole dataset");
  for (const id of allIds) {
    assert.ok(id.length > 0);
  }
});

test("seed contact details use only reserved/fictional domains and placeholder phone numbers", () => {
  const realLookingPhonePattern = /\b(?!0{4}[\s-]?0{3}[\s-]?\d{3}\b)\d{3,4}[\s-]?\d{3}[\s-]?\d{3,4}\b/;

  for (const org of seedSupportOrganisations) {
    if (org.email) assert.match(org.email, /@example\.org$/);
    if (org.website) assert.match(org.website, /^https:\/\/example\.org\//);
    if (org.phone) assert.doesNotMatch(org.phone, realLookingPhonePattern);
  }

  for (const professional of seedSupportProfessionals) {
    if (professional.email) assert.match(professional.email, /@example\.org$/);
    if (professional.phone) assert.doesNotMatch(professional.phone, realLookingPhonePattern);
  }
});

test("advocates and counsellors seed data includes both a verified and a not_verified published profile", () => {
  const publishedUnverified = seedSupportProfessionals.find(
    (p) => p.status === "published" && p.verificationStatus === "not_verified"
  );
  const publishedVerified = seedSupportProfessionals.find(
    (p) => p.status === "published" && p.verificationStatus === "verified"
  );

  assert.ok(publishedUnverified, "expected a published-but-unverified demo profile");
  assert.ok(publishedVerified, "expected a published-and-verified demo profile");
});

test("seed data exercises both published and draft legislation documents", () => {
  assert.ok(seedDocuments.some((d) => d.status === "published"));
  assert.ok(seedDocuments.some((d) => d.status === "draft" || d.status === "ready_for_review"));
});

test("seed data includes a document with a local processing issue", () => {
  assert.ok(seedDocuments.some((d) => d.processingStatus === "processing_issue" && d.processingIssue));
});

test("buildSeedAuditEvents produces one event per seeded content record plus a summary event", () => {
  const contentRecordCount =
    seedDocuments.length +
    seedMicrocards.length +
    seedRightsContent.length +
    seedSupportOrganisations.length +
    seedSupportProfessionals.length +
    seedReportingDestinations.length +
    seedIncidentTypes.length +
    seedTriageLabels.length +
    seedResourceCategories.length;

  const events = buildSeedAuditEvents("2026-06-01T09:00:00.000Z");
  assert.equal(events.length, contentRecordCount + 1);
  assert.ok(events.every((e) => e.isDemo === true));
  assert.ok(events.every((e) => e.timestamp === "2026-06-01T09:00:00.000Z"));
});
