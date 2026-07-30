import assert from "node:assert/strict";
import test from "node:test";

import {
  getAiEligibilityBlockers,
  getOverallReadiness,
  getPublicationBlockers,
  getRagReadinessChecklist,
  isAiEligible,
  isPublishable,
  isRequiredMetadataComplete,
  isReviewOverdue,
  summarizeReadiness,
} from "../../src/lib/legislation/readiness";
import { makeTestDocument } from "./helpers/document-fixture";

test("a fully-eligible document has no publication blockers", () => {
  assert.deepEqual(getPublicationBlockers(makeTestDocument()), []);
  assert.equal(isPublishable(makeTestDocument()), true);
});

test("publication does not require AI usage permission", () => {
  const doc = makeTestDocument({ aiUsagePermission: false, status: "ready_for_review" });
  assert.equal(isPublishable(doc), true);
});

test("publication does not require a next review date or a non-default license status", () => {
  const doc = makeTestDocument({ nextReviewDate: undefined, licenseStatus: "unknown", status: "ready_for_review" });
  assert.equal(isPublishable(doc), true);
});

test("publication is blocked without a local file", () => {
  const doc = makeTestDocument({ file: undefined, status: "ready_for_review" });
  const blockers = getPublicationBlockers(doc);
  assert.ok(blockers.some((b) => /pdf/i.test(b)));
});

test("publication is blocked when extraction has not succeeded", () => {
  const doc = makeTestDocument({ extractionStatus: "not_extracted", localPreviewStatus: "unavailable", status: "ready_for_review" });
  const blockers = getPublicationBlockers(doc);
  assert.ok(blockers.some((b) => /extraction/i.test(b)));
});

test("publication is blocked when required source metadata is incomplete", () => {
  const doc = makeTestDocument({ authorityOrPublisher: undefined, status: "ready_for_review" });
  assert.equal(isRequiredMetadataComplete(doc), false);
  assert.equal(isPublishable(doc), false);
});

test("publication is blocked by an unresolved processing issue", () => {
  const doc = makeTestDocument({ processingStatus: "processing_issue", status: "ready_for_review" });
  const blockers = getPublicationBlockers(doc);
  assert.ok(blockers.some((b) => /processing issue/i.test(b)));
});

test("AI eligibility requires publication, AI permission, legal review, and successful extraction", () => {
  assert.equal(isAiEligible(makeTestDocument()), true);
  assert.equal(isAiEligible(makeTestDocument({ status: "draft" })), false);
  assert.equal(isAiEligible(makeTestDocument({ aiUsagePermission: false })), false);
  assert.equal(isAiEligible(makeTestDocument({ legalReviewComplete: false })), false);
  assert.equal(isAiEligible(makeTestDocument({ extractionStatus: "not_extracted", localPreviewStatus: "unavailable" })), false);
});

test("an archived record is never AI-eligible even if every other flag is set", () => {
  const doc = makeTestDocument({ status: "archived" });
  assert.equal(isAiEligible(doc), false);
  assert.ok(getAiEligibilityBlockers(doc).some((b) => /archived/i.test(b)));
});

test("isReviewOverdue compares against a supplied reference date", () => {
  const doc = makeTestDocument({ nextReviewDate: "2026-01-01" });
  assert.equal(isReviewOverdue(doc, new Date("2026-06-01")), true);
  assert.equal(isReviewOverdue(doc, new Date("2025-06-01")), false);
});

test("isReviewOverdue is false when there is no review date", () => {
  const doc = makeTestDocument({ nextReviewDate: undefined });
  assert.equal(isReviewOverdue(doc, new Date("2030-01-01")), false);
});

test("the RAG readiness checklist reports every dimension independently", () => {
  const doc = makeTestDocument({ aiUsagePermission: false });
  const checklist = getRagReadinessChecklist(doc);
  const byKey = Object.fromEntries(checklist.map((c) => [c.key, c.met]));
  assert.equal(byKey.aiPermission, false);
  assert.equal(byKey.legalReview, true);
  assert.equal(byKey.file, true);
});

test("overall readiness reflects processing issues first, then AI eligibility, then awaiting review", () => {
  assert.equal(getOverallReadiness(makeTestDocument({ processingStatus: "processing_issue" })), "processing_issue");
  assert.equal(getOverallReadiness(makeTestDocument()), "ready");
  assert.equal(getOverallReadiness(makeTestDocument({ status: "draft", aiUsagePermission: false })), "awaiting_review");
  assert.equal(getOverallReadiness(makeTestDocument({ status: "needs_update", aiUsagePermission: false })), "blocked");
});

test("summarizeReadiness aggregates counts across a document list", () => {
  const docs = [
    makeTestDocument({ id: "a" }),
    makeTestDocument({ id: "b", status: "draft", legalReviewComplete: false }),
    makeTestDocument({ id: "c", status: "archived" }),
    makeTestDocument({ id: "d", processingStatus: "processing_issue" }),
    makeTestDocument({ id: "e", nextReviewDate: "2020-01-01" }),
  ];

  const summary = summarizeReadiness(docs);
  assert.equal(summary.totalDocuments, 5);
  assert.equal(summary.archived, 1);
  assert.equal(summary.processingIssues, 1);
  assert.equal(summary.awaitingLegalReview, 1);
  assert.ok(summary.overdueForReview >= 1);
});
