import assert from "node:assert/strict";
import test from "node:test";

import { CONTENT_STATUSES } from "../../src/lib/models/base";
import { seedMatchingRules, seedMicrocards, seedRightsContent } from "../../src/lib/db/seed";
import { getMicrocardBlockers } from "../../src/lib/microcards/eligibility";
import { contentTypeRequiresLegalSource, getRightsContentBlockers } from "../../src/lib/rights-content/eligibility";
import { getReviewDueState } from "../../src/lib/content/review-due";
import { findDanglingTaxonomyReferences, type TaxonomyDataBundle } from "../../src/lib/taxonomy/dependency-service";
import {
  seedDocuments,
  seedIncidentTypes,
  seedReportingDestinations,
  seedResourceCategories,
  seedSupportOrganisations,
  seedSupportProfessionals,
  seedTriageLabels,
} from "../../src/lib/db/seed";

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

test("seed microcards exercise every content status at least once", () => {
  for (const status of CONTENT_STATUSES) {
    assert.ok(seedMicrocards.some((c) => c.status === status), `expected a seed microcard with status "${status}"`);
  }
});

test("seed rights content records exercise every content status at least once", () => {
  for (const status of CONTENT_STATUSES) {
    assert.ok(seedRightsContent.some((r) => r.status === status), `expected a seed rights content record with status "${status}"`);
  }
});

test("seed microcards exercise every review-due state (current, due soon, overdue)", () => {
  const referenceDate = new Date("2026-06-01T09:00:00.000Z");
  const states = new Set(seedMicrocards.map((c) => getReviewDueState(c.reviewDueDate, referenceDate)));
  assert.ok(states.has("current"), "expected at least one seed microcard with a far-future review date");
  assert.ok(states.has("due_soon"), "expected at least one seed microcard due for review soon");
  assert.ok(states.has("overdue"), "expected at least one seed microcard overdue for review");
});

test("seed data includes both a legal-claim and an informational rights content type", () => {
  assert.ok(seedRightsContent.some((r) => contentTypeRequiresLegalSource(r.contentType)));
  assert.ok(seedRightsContent.some((r) => !contentTypeRequiresLegalSource(r.contentType)));
});

test("seed data includes a fully governed (published, legal-review-complete) legal-claim rights content record", () => {
  const eligibilityContext = { resourceCategories: seedResourceCategories, documents: seedDocuments, supportOrganisations: seedSupportOrganisations };
  const governed = seedRightsContent.find(
    (r) => r.status === "published" && contentTypeRequiresLegalSource(r.contentType) && getRightsContentBlockers(r, eligibilityContext).length === 0
  );
  assert.ok(governed, "expected at least one published, fully-eligible legal-claim rights content record");
});

test("seed data includes an incomplete legal-claim rights content record (missing governed source and/or disclaimer)", () => {
  const eligibilityContext = { resourceCategories: seedResourceCategories, documents: seedDocuments, supportOrganisations: seedSupportOrganisations };
  const incomplete = seedRightsContent.find(
    (r) => contentTypeRequiresLegalSource(r.contentType) && getRightsContentBlockers(r, eligibilityContext).length > 0
  );
  assert.ok(incomplete, "expected at least one legal-claim rights content record that is not yet publish-eligible");
});

test("a matching rule references a draft microcard, demonstrating dependency protection on hard delete", () => {
  const referencedIds = new Set(seedMatchingRules.flatMap((r) => r.microcardIds));
  const referencedDraft = seedMicrocards.find((c) => c.status === "draft" && referencedIds.has(c.id));
  assert.ok(referencedDraft, "expected a draft microcard referenced by a seed matching rule");
});

test("a matching rule references a draft rights content record, demonstrating dependency protection on hard delete", () => {
  const referencedIds = new Set(seedMatchingRules.flatMap((r) => r.rightsContentIds));
  const referencedDraft = seedRightsContent.find((r) => r.status === "draft" && referencedIds.has(r.id));
  assert.ok(referencedDraft, "expected a draft rights content record referenced by a seed matching rule");
});

test("seed data includes an unreferenced, fully-eligible draft microcard that can be safely hard-deleted", () => {
  const referencedIds = new Set(seedMatchingRules.flatMap((r) => r.microcardIds));
  const eligibilityContext = { resourceCategories: seedResourceCategories, documents: seedDocuments, supportOrganisations: seedSupportOrganisations, rightsContent: seedRightsContent };
  const safeToDelete = seedMicrocards.find(
    (c) => c.status === "draft" && !referencedIds.has(c.id) && getMicrocardBlockers(c, eligibilityContext).length === 0
  );
  assert.ok(safeToDelete, "expected an unreferenced, fully-eligible draft microcard");
});

test("every seeded microcard CTA target that points at a stable-id domain resolves to a real seed record", () => {
  const rightsContentIds = new Set(seedRightsContent.map((r) => r.id));
  const documentIds = new Set(seedDocuments.map((d) => d.id));
  const orgIds = new Set(seedSupportOrganisations.map((o) => o.id));

  for (const card of seedMicrocards) {
    if (card.cta.type === "view_rights_information") assert.ok(card.cta.target && rightsContentIds.has(card.cta.target), `${card.id} CTA target should resolve`);
    if (card.cta.type === "view_legislation_source") assert.ok(card.cta.target && documentIds.has(card.cta.target), `${card.id} CTA target should resolve`);
    if (card.cta.type === "view_support_service") assert.ok(card.cta.target && orgIds.has(card.cta.target), `${card.id} CTA target should resolve`);
  }
});

test("the full seed dataset has no dangling microcard or rights_content references", () => {
  for (const kind of ["microcard", "rights_content"] as const) {
    assert.deepEqual(findDanglingTaxonomyReferences(kind, bundle), [], `unexpected dangling ${kind} reference(s) in seed data`);
  }
});

test("multiple Australian jurisdictions are represented across seed microcards and rights content", () => {
  const jurisdictions = new Set([...seedMicrocards.map((c) => c.jurisdiction), ...seedRightsContent.map((r) => r.jurisdiction)]);
  assert.ok(jurisdictions.size >= 3, "expected demo content to span at least 3 different jurisdictions");
});
