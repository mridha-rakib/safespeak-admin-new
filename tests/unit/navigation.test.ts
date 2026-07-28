import assert from "node:assert/strict";
import test from "node:test";

import { NAV_SECTIONS, findGroupLabelForPath, findNavLinkForPath, flattenNavLinks } from "../../src/lib/navigation";

test("navigation config exposes every required admin destination", () => {
  const links = flattenNavLinks();
  const labels = links.map((l) => l.label).sort();

  assert.deepEqual(labels, [
    "Advocates & Counsellors",
    "Audit History",
    "Dashboard",
    "Incident Types",
    "Knowledge & Legislation",
    "Matching Rules",
    "Microcards",
    "Reporting Destinations",
    "Resource Categories",
    "Review Queue",
    "Rights & Legal Information",
    "Settings",
    "Support Organisations",
    "Triage Labels",
  ]);
});

test("every nav link has a unique, absolute href", () => {
  const links = flattenNavLinks();
  const hrefs = links.map((l) => l.href);

  assert.equal(new Set(hrefs).size, hrefs.length, "hrefs must be unique");
  for (const href of hrefs) {
    assert.ok(href.startsWith("/"), `${href} should be an absolute path`);
  }
});

test("groups only contain grouped items, and top-level links stay top-level", () => {
  const dashboard = NAV_SECTIONS.find((s) => s.type === "link" && s.label === "Dashboard");
  const settings = NAV_SECTIONS.find((s) => s.type === "link" && s.label === "Settings");
  assert.ok(dashboard);
  assert.ok(settings);

  const groups = NAV_SECTIONS.filter((s) => s.type === "group");
  assert.deepEqual(
    groups.map((g) => g.label),
    ["Content", "Taxonomy & Matching", "Publishing"]
  );
});

test("findNavLinkForPath matches a route and its sub-paths", () => {
  const link = findNavLinkForPath("/content/knowledge-legislation");
  assert.equal(link?.label, "Knowledge & Legislation");

  const subLink = findNavLinkForPath("/content/knowledge-legislation/some-document");
  assert.equal(subLink?.label, "Knowledge & Legislation");

  assert.equal(findNavLinkForPath("/not-a-real-route"), undefined);
});

test("findGroupLabelForPath resolves the owning group, not top-level links", () => {
  assert.equal(findGroupLabelForPath("/content/microcards"), "Content");
  assert.equal(findGroupLabelForPath("/taxonomy/matching-rules"), "Taxonomy & Matching");
  assert.equal(findGroupLabelForPath("/publishing/audit-history"), "Publishing");
  assert.equal(findGroupLabelForPath("/dashboard"), undefined);
  assert.equal(findGroupLabelForPath("/settings"), undefined);
});
