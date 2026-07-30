import assert from "node:assert/strict";
import test from "node:test";

import {
  applyTaxonomyListFilters,
  DEFAULT_TAXONOMY_LIST_FILTERS,
  isTaxonomyFilterActive,
  type TaxonomyListFilters,
} from "../../src/lib/taxonomy/list-filters";
import { makeTestIncidentType } from "./helpers/taxonomy-fixture";

const records = [
  makeTestIncidentType({ id: "1", status: "draft", isDemo: true }),
  makeTestIncidentType({ id: "2", status: "published", isDemo: false }),
  makeTestIncidentType({ id: "3", status: "archived", isDemo: false }),
];

test("default filters hide archived records but keep everything else", () => {
  const result = applyTaxonomyListFilters(records, DEFAULT_TAXONOMY_LIST_FILTERS);
  assert.deepEqual(result.map((r) => r.id), ["1", "2"]);
});

test("explicitly filtering to archived status shows only archived records", () => {
  const filters: TaxonomyListFilters = { ...DEFAULT_TAXONOMY_LIST_FILTERS, status: "archived" };
  const result = applyTaxonomyListFilters(records, filters);
  assert.deepEqual(result.map((r) => r.id), ["3"]);
});

test("showArchived: true includes archived records alongside everything else", () => {
  const filters: TaxonomyListFilters = { ...DEFAULT_TAXONOMY_LIST_FILTERS, showArchived: true };
  const result = applyTaxonomyListFilters(records, filters);
  assert.deepEqual(result.map((r) => r.id), ["1", "2", "3"]);
});

test("demoFilter narrows to demo-only or non-demo-only records", () => {
  assert.deepEqual(
    applyTaxonomyListFilters(records, { ...DEFAULT_TAXONOMY_LIST_FILTERS, demoFilter: "demo_only" }).map((r) => r.id),
    ["1"]
  );
  assert.deepEqual(
    applyTaxonomyListFilters(records, { ...DEFAULT_TAXONOMY_LIST_FILTERS, demoFilter: "non_demo_only" }).map((r) => r.id),
    ["2"]
  );
});

test("isTaxonomyFilterActive is false only for the exact default filter set", () => {
  assert.equal(isTaxonomyFilterActive(DEFAULT_TAXONOMY_LIST_FILTERS), false);
  assert.equal(isTaxonomyFilterActive({ ...DEFAULT_TAXONOMY_LIST_FILTERS, status: "published" }), true);
  assert.equal(isTaxonomyFilterActive({ ...DEFAULT_TAXONOMY_LIST_FILTERS, demoFilter: "demo_only" }), true);
  assert.equal(isTaxonomyFilterActive({ ...DEFAULT_TAXONOMY_LIST_FILTERS, showArchived: true }), true);
});
