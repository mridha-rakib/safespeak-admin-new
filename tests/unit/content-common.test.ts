import assert from "node:assert/strict";
import test from "node:test";

import { isSelectableForNewRelationship, resolveRelationshipIds } from "../../src/lib/content/relationship-ids";
import { getReviewDueState, isReviewDueOverdue, REVIEW_DUE_SOON_WINDOW_DAYS } from "../../src/lib/content/review-due";

const REFERENCE_DATE = new Date("2026-06-01T09:00:00.000Z");

test("getReviewDueState returns 'none' when the date is unset or unparseable", () => {
  assert.equal(getReviewDueState(undefined, REFERENCE_DATE), "none");
  assert.equal(getReviewDueState("", REFERENCE_DATE), "none");
  assert.equal(getReviewDueState("not-a-date", REFERENCE_DATE), "none");
});

test("getReviewDueState returns 'overdue' for a date in the past", () => {
  assert.equal(getReviewDueState("2026-01-01", REFERENCE_DATE), "overdue");
});

test("getReviewDueState returns 'due_soon' within the due-soon window, 'current' beyond it", () => {
  const dueSoon = new Date(REFERENCE_DATE.getTime() + (REVIEW_DUE_SOON_WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000).toISOString();
  const current = new Date(REFERENCE_DATE.getTime() + (REVIEW_DUE_SOON_WINDOW_DAYS + 5) * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(getReviewDueState(dueSoon, REFERENCE_DATE), "due_soon");
  assert.equal(getReviewDueState(current, REFERENCE_DATE), "current");
});

test("isReviewDueOverdue is true only for the overdue state", () => {
  assert.equal(isReviewDueOverdue("2026-01-01", REFERENCE_DATE), true);
  assert.equal(isReviewDueOverdue("2027-01-01", REFERENCE_DATE), false);
  assert.equal(isReviewDueOverdue(undefined, REFERENCE_DATE), false);
});

interface FakeRecord {
  id: string;
  status: "draft" | "ready_for_review" | "published" | "needs_update" | "archived";
}

test("resolveRelationshipIds splits ids into resolved records and dangling ids", () => {
  const records: FakeRecord[] = [{ id: "a", status: "published" }, { id: "b", status: "draft" }];
  const result = resolveRelationshipIds(["a", "b", "missing"], records);
  assert.equal(result.resolved.length, 2);
  assert.deepEqual(result.danglingIds, ["missing"]);
});

test("resolveRelationshipIds treats an empty input array as fully resolved with no dangling ids", () => {
  const result = resolveRelationshipIds([], []);
  assert.deepEqual(result.resolved, []);
  assert.deepEqual(result.danglingIds, []);
});

test("isSelectableForNewRelationship is true only for published status", () => {
  assert.equal(isSelectableForNewRelationship("published"), true);
  assert.equal(isSelectableForNewRelationship("draft"), false);
  assert.equal(isSelectableForNewRelationship("ready_for_review"), false);
  assert.equal(isSelectableForNewRelationship("needs_update"), false);
  assert.equal(isSelectableForNewRelationship("archived"), false);
});
