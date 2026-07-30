import assert from "node:assert/strict";
import test from "node:test";

import { createBaseFields } from "../../src/lib/models/base";
import { microcardSchema } from "../../src/lib/models/microcard";
import { microcardCtaSchema } from "../../src/lib/models/microcard-cta";
import { rightsContentSchema } from "../../src/lib/models/rights-content";
import { contentPrioritySchema } from "../../src/lib/models/content-common";

test("microcardSchema rejects a record missing a required title or summary", () => {
  assert.equal(microcardSchema.safeParse({ ...createBaseFields() }).success, false);
  assert.equal(microcardSchema.safeParse({ ...createBaseFields(), title: "A card" }).success, false);
  assert.equal(microcardSchema.safeParse({ ...createBaseFields(), title: "A card", summary: "A summary" }).success, true);
});

test("microcardSchema defaults tags, incidentTypeIds, priority, displayOrder, and cta", () => {
  const parsed = microcardSchema.parse({ ...createBaseFields(), title: "A card", summary: "A summary" });
  assert.deepEqual(parsed.tags, []);
  assert.deepEqual(parsed.incidentTypeIds, []);
  assert.equal(parsed.priority, "normal");
  assert.equal(parsed.displayOrder, 0);
  assert.deepEqual(parsed.cta, { type: "none" });
});

test("microcardSchema rejects a negative displayOrder", () => {
  const result = microcardSchema.safeParse({ ...createBaseFields(), title: "A card", summary: "A summary", displayOrder: -1 });
  assert.equal(result.success, false);
});

test("microcardCtaSchema allows type none or start_report with no target", () => {
  assert.equal(microcardCtaSchema.safeParse({ type: "none" }).success, true);
  assert.equal(microcardCtaSchema.safeParse({ type: "start_report" }).success, true);
});

test("microcardCtaSchema requires a target for every other CTA type", () => {
  assert.equal(microcardCtaSchema.safeParse({ type: "view_rights_information" }).success, false);
  assert.equal(microcardCtaSchema.safeParse({ type: "view_rights_information", target: "rc-1" }).success, true);
});

test("microcardCtaSchema restricts open_internal_route to the internal route allow-list", () => {
  assert.equal(microcardCtaSchema.safeParse({ type: "open_internal_route", target: "/support" }).success, true);
  assert.equal(microcardCtaSchema.safeParse({ type: "open_internal_route", target: "/not-a-real-route" }).success, false);
});

test("microcardCtaSchema requires an https:// URL for open_safe_external_link", () => {
  assert.equal(microcardCtaSchema.safeParse({ type: "open_safe_external_link", target: "https://example.org" }).success, true);
  assert.equal(microcardCtaSchema.safeParse({ type: "open_safe_external_link", target: "http://example.org" }).success, false);
  assert.equal(microcardCtaSchema.safeParse({ type: "open_safe_external_link", target: "javascript:alert(1)" }).success, false);
});

test("rightsContentSchema rejects a record missing a required title or summary", () => {
  assert.equal(rightsContentSchema.safeParse({ ...createBaseFields() }).success, false);
  assert.equal(
    rightsContentSchema.safeParse({ ...createBaseFields(), title: "A record", summary: "A summary" }).success,
    true
  );
});

test("rightsContentSchema defaults resourceCategoryIds, relatedLegislationIds, tags, and priority", () => {
  const parsed = rightsContentSchema.parse({ ...createBaseFields(), title: "A record", summary: "A summary" });
  assert.deepEqual(parsed.resourceCategoryIds, []);
  assert.deepEqual(parsed.relatedLegislationIds, []);
  assert.deepEqual(parsed.tags, []);
  assert.equal(parsed.priority, "normal");
});

test("rightsContentSchema accepts only the typed Australian jurisdiction values", () => {
  assert.equal(
    rightsContentSchema.safeParse({ ...createBaseFields(), title: "A record", summary: "A summary", jurisdiction: "nsw" }).success,
    true
  );
  assert.equal(
    rightsContentSchema.safeParse({ ...createBaseFields(), title: "A record", summary: "A summary", jurisdiction: "Not A Jurisdiction" })
      .success,
    false
  );
});

test("contentPrioritySchema accepts exactly the four content priority values", () => {
  for (const value of ["low", "normal", "high", "critical"]) {
    assert.equal(contentPrioritySchema.safeParse(value).success, true);
  }
  assert.equal(contentPrioritySchema.safeParse("medium").success, false);
});
