import assert from "node:assert/strict";
import test from "node:test";

import { baseRecordSchema, createBaseFields } from "../../src/lib/models/base";
import { documentSchema } from "../../src/lib/models/document";
import { isPublishable } from "../../src/lib/legislation/readiness";
import {
  isPublishableWhileUnverified,
  supportProfessionalSchema,
} from "../../src/lib/models/support-professional";
import { makeTestDocument } from "./helpers/document-fixture";

test("createBaseFields produces a record that satisfies baseRecordSchema", () => {
  const record = createBaseFields();
  assert.doesNotThrow(() => baseRecordSchema.parse(record));
  assert.equal(record.isDemo, false);
  assert.equal(record.status, "draft");
  assert.equal(record.version, 1);
});

test("a legislation document cannot publish without a completed legal review", () => {
  assert.equal(isPublishable(makeTestDocument({ legalReviewComplete: false })), false);
  assert.equal(isPublishable(makeTestDocument({ legalReviewComplete: true })), true);
});

test("documentSchema rejects a record missing a required title", () => {
  const result = documentSchema.safeParse({ ...createBaseFields(), sourceType: "legislation" });
  assert.equal(result.success, false);
});

test("documentSchema defaults processing/extraction status to their not-started states", () => {
  const parsed = documentSchema.parse({ ...createBaseFields(), title: "Untitled" });
  assert.equal(parsed.processingStatus, "not_processed");
  assert.equal(parsed.extractionStatus, "not_extracted");
  assert.equal(parsed.localPreviewStatus, "unavailable");
});

test("a support professional may always publish while unverified", () => {
  assert.equal(isPublishableWhileUnverified(), true);
});

test("supportProfessionalSchema defaults verificationStatus to not_verified", () => {
  const parsed = supportProfessionalSchema.parse({
    ...createBaseFields(),
    fullName: "Test Person",
    professionalType: "advocate",
  });
  assert.equal(parsed.verificationStatus, "not_verified");
});

test("supportProfessionalSchema rejects an unknown professionalType", () => {
  const result = supportProfessionalSchema.safeParse({
    ...createBaseFields(),
    fullName: "Test Person",
    professionalType: "wizard",
  });
  assert.equal(result.success, false);
});
