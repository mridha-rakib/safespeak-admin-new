import assert from "node:assert/strict";
import test from "node:test";

import {
  canTransitionStatus,
  isValidStatusTransition,
  legislationPublishGuard,
  supportProfessionalPublishGuard,
} from "../../src/lib/publishing/workflow";

test("draft can move to ready_for_review or archived, not straight to published", () => {
  assert.equal(isValidStatusTransition("draft", "ready_for_review"), true);
  assert.equal(isValidStatusTransition("draft", "archived"), true);
  assert.equal(isValidStatusTransition("draft", "published"), false);
});

test("published can move to needs_update or archived, not back to draft directly", () => {
  assert.equal(isValidStatusTransition("published", "needs_update"), true);
  assert.equal(isValidStatusTransition("published", "archived"), true);
  assert.equal(isValidStatusTransition("published", "draft"), false);
});

test("archived can only reopen to draft", () => {
  assert.equal(isValidStatusTransition("archived", "draft"), true);
  assert.equal(isValidStatusTransition("archived", "published"), false);
});

test("a status can always transition to itself", () => {
  assert.equal(isValidStatusTransition("published", "published"), true);
});

test("legislation cannot publish without a completed legal review", () => {
  const guard = legislationPublishGuard(false);
  const result = canTransitionStatus("ready_for_review", "published", guard);
  assert.equal(result.allowed, false);
  assert.match(result.reason ?? "", /legal/i);
});

test("legislation can publish once legal review is complete", () => {
  const guard = legislationPublishGuard(true);
  const result = canTransitionStatus("ready_for_review", "published", guard);
  assert.equal(result.allowed, true);
});

test("legislation guard does not block non-publish transitions", () => {
  const guard = legislationPublishGuard(false);
  const result = canTransitionStatus("draft", "ready_for_review", guard);
  assert.equal(result.allowed, true);
});

test("an invalid transition is rejected even with an always-allow guard", () => {
  const result = canTransitionStatus("draft", "published", supportProfessionalPublishGuard());
  assert.equal(result.allowed, false);
});

test("a support professional may publish while unverified", () => {
  const result = canTransitionStatus("ready_for_review", "published", supportProfessionalPublishGuard());
  assert.equal(result.allowed, true);
});
