import assert from "node:assert/strict";
import test from "node:test";

import { getMicrocardBlockers } from "../../src/lib/microcards/eligibility";
import { contentTypeRequiresLegalSource, getRightsContentBlockers } from "../../src/lib/rights-content/eligibility";
import { makeTestDocument } from "./helpers/document-fixture";
import { makeEmptyTaxonomyDataBundle, makeTestMicrocard, makeTestRightsContent } from "./helpers/taxonomy-data-bundle-fixture";
import { makeTestResourceCategory } from "./helpers/taxonomy-fixture";

function fullyEligibleMicrocard() {
  return makeTestMicrocard({
    title: "A card",
    summary: "Short guidance",
    body: "Full content",
    cardType: "quick_guidance",
    jurisdiction: "nsw",
    reviewDueDate: "2027-01-01",
    displayOrder: 0,
    resourceCategoryId: "rc-1",
  });
}

test("a fully-eligible microcard has no publish blockers", () => {
  const context = { resourceCategories: [makeTestResourceCategory({ id: "rc-1" })], documents: [], supportOrganisations: [], rightsContent: [] };
  assert.deepEqual(getMicrocardBlockers(fullyEligibleMicrocard(), context), []);
});

test("microcard publish is blocked without title, short guidance, full content, card type, jurisdiction, or review due date", () => {
  const context = makeEmptyTaxonomyDataBundle();
  assert.ok(getMicrocardBlockers(makeTestMicrocard({ title: "" }), context).some((b) => /title/i.test(b)));
  assert.ok(getMicrocardBlockers(makeTestMicrocard({ summary: "" }), context).some((b) => /guidance/i.test(b)));
  assert.ok(getMicrocardBlockers(makeTestMicrocard({ body: undefined }), context).some((b) => /full content/i.test(b)));
  assert.ok(getMicrocardBlockers(makeTestMicrocard({ cardType: undefined }), context).some((b) => /card type/i.test(b)));
  assert.ok(getMicrocardBlockers(makeTestMicrocard({ jurisdiction: undefined }), context).some((b) => /jurisdiction/i.test(b)));
  assert.ok(getMicrocardBlockers(makeTestMicrocard({ reviewDueDate: undefined }), context).some((b) => /review due date/i.test(b)));
});

test("microcard publish requires a resource category, and flags one that no longer exists", () => {
  const withoutCategory = fullyEligibleMicrocard();
  withoutCategory.resourceCategoryId = undefined;
  assert.ok(getMicrocardBlockers(withoutCategory, makeEmptyTaxonomyDataBundle()).some((b) => /resource category is required/i.test(b)));

  const danglingCategory = fullyEligibleMicrocard();
  assert.ok(getMicrocardBlockers(danglingCategory, makeEmptyTaxonomyDataBundle()).some((b) => /no longer exists/i.test(b)));
});

test("microcard publish does not block on a related record that still exists but is no longer published", () => {
  const card = fullyEligibleMicrocard();
  card.relatedLegislationIds = ["doc-1"];
  const context = makeEmptyTaxonomyDataBundle({
    resourceCategories: [makeTestResourceCategory({ id: "rc-1" })],
    documents: [makeTestDocument({ id: "doc-1", status: "archived" })],
  });
  assert.deepEqual(getMicrocardBlockers(card, context), []);
});

test("microcard publish blocks on a related legislation reference that no longer exists at all", () => {
  const card = fullyEligibleMicrocard();
  card.relatedLegislationIds = ["missing-doc"];
  const context = makeEmptyTaxonomyDataBundle({ resourceCategories: [makeTestResourceCategory({ id: "rc-1" })] });
  assert.ok(getMicrocardBlockers(card, context).some((b) => /legislation reference\(s\) no longer exist/i.test(b)));
});

test("microcard publish blocks when a CTA needing a target has none, or targets a record that no longer exists", () => {
  const context = { resourceCategories: [makeTestResourceCategory({ id: "rc-1" })], documents: [], supportOrganisations: [], rightsContent: [] };

  const noTarget = fullyEligibleMicrocard();
  noTarget.cta = { type: "view_support_service" };
  assert.ok(getMicrocardBlockers(noTarget, context).some((b) => /call-to-action needs a target/i.test(b)));

  const danglingTarget = fullyEligibleMicrocard();
  danglingTarget.cta = { type: "view_support_service", target: "org-missing" };
  assert.ok(getMicrocardBlockers(danglingTarget, context).some((b) => /support service no longer exists/i.test(b)));
});

test("microcard publish does not require a CTA at all — type 'none' and 'start_report' never block", () => {
  const context = { resourceCategories: [makeTestResourceCategory({ id: "rc-1" })], documents: [], supportOrganisations: [], rightsContent: [] };
  assert.deepEqual(getMicrocardBlockers({ ...fullyEligibleMicrocard(), cta: { type: "none" } }, context), []);
  assert.deepEqual(getMicrocardBlockers({ ...fullyEligibleMicrocard(), cta: { type: "start_report" } }, context), []);
});

test("contentTypeRequiresLegalSource is true for legal-claim types and false for informational types", () => {
  assert.equal(contentTypeRequiresLegalSource("discrimination_rights"), true);
  assert.equal(contentTypeRequiresLegalSource("workplace_rights"), true);
  assert.equal(contentTypeRequiresLegalSource("evidence_information"), false);
  assert.equal(contentTypeRequiresLegalSource("other"), false);
});

test("contentTypeRequiresLegalSource treats an unset content type as the stricter (requires-source) case", () => {
  assert.equal(contentTypeRequiresLegalSource(undefined), true);
});

function fullyEligibleRightsContent() {
  return makeTestRightsContent({
    title: "A record",
    summary: "A short summary",
    body: "Full content",
    contentType: "evidence_information",
    jurisdiction: "nsw",
    reviewDueDate: "2027-01-01",
    resourceCategoryIds: ["rc-1"],
  });
}

test("a fully-eligible informational rights content record has no publish blockers", () => {
  const context = { resourceCategories: [makeTestResourceCategory({ id: "rc-1" })], documents: [], supportOrganisations: [] };
  assert.deepEqual(getRightsContentBlockers(fullyEligibleRightsContent(), context), []);
});

test("rights content publish requires at least one resource category", () => {
  const record = fullyEligibleRightsContent();
  record.resourceCategoryIds = [];
  assert.ok(getRightsContentBlockers(record, makeEmptyTaxonomyDataBundle()).some((b) => /at least one resource category/i.test(b)));
});

test("a legal-claim rights content record additionally requires a governed legislation source and a disclaimer", () => {
  const record = fullyEligibleRightsContent();
  record.contentType = "discrimination_rights";
  const context = { resourceCategories: [makeTestResourceCategory({ id: "rc-1" })], documents: [], supportOrganisations: [] };
  const blockers = getRightsContentBlockers(record, context);
  assert.ok(blockers.some((b) => /legislation source/i.test(b)));
  assert.ok(blockers.some((b) => /disclaimer/i.test(b)));
});

test("a legal-claim rights content record is eligible once it has a published, legal-review-complete source and a disclaimer", () => {
  const record = fullyEligibleRightsContent();
  record.contentType = "discrimination_rights";
  record.relatedLegislationIds = ["doc-1"];
  record.publicDisclaimer = "This is general information only.";
  const context = {
    resourceCategories: [makeTestResourceCategory({ id: "rc-1" })],
    documents: [makeTestDocument({ id: "doc-1", status: "published", legalReviewComplete: true })],
    supportOrganisations: [],
  };
  assert.deepEqual(getRightsContentBlockers(record, context), []);
});

test("a legal-claim rights content record is still blocked by a legislation source that is not published or not legal-review-complete", () => {
  const record = fullyEligibleRightsContent();
  record.contentType = "discrimination_rights";
  record.relatedLegislationIds = ["doc-1"];
  record.publicDisclaimer = "This is general information only.";
  const context = {
    resourceCategories: [makeTestResourceCategory({ id: "rc-1" })],
    documents: [makeTestDocument({ id: "doc-1", status: "ready_for_review", legalReviewComplete: true })],
    supportOrganisations: [],
  };
  assert.ok(getRightsContentBlockers(record, context).some((b) => /legislation source/i.test(b)));
});
