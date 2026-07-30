import assert from "node:assert/strict";
import test from "node:test";

import { CONTENT_STATUSES } from "../../src/lib/models/base";
import { VERIFICATION_STATUSES } from "../../src/lib/models/verification";
import {
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
import { getSupportOrganisationBlockers } from "../../src/lib/support-directory/support-organisation-eligibility";
import { getProfessionalBlockers } from "../../src/lib/support-directory/professional-eligibility";
import { getDestinationBlockers } from "../../src/lib/support-directory/destination-eligibility";
import { getUnsupportedReportingMethods } from "../../src/lib/support-directory/reporting-method";
import { findDanglingTaxonomyReferences, type TaxonomyDataBundle } from "../../src/lib/taxonomy/dependency-service";

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

const directoryEligibilityContext = { resourceCategories: seedResourceCategories, supportOrganisations: seedSupportOrganisations };

test("seed support organisations exercise every content status at least once", () => {
  for (const status of CONTENT_STATUSES) {
    assert.ok(seedSupportOrganisations.some((o) => o.status === status), `expected a seed organisation with status "${status}"`);
  }
});

test("seed support professionals exercise every content status at least once", () => {
  for (const status of CONTENT_STATUSES) {
    assert.ok(seedSupportProfessionals.some((p) => p.status === status), `expected a seed professional with status "${status}"`);
  }
});

test("seed reporting destinations exercise every content status at least once", () => {
  for (const status of CONTENT_STATUSES) {
    assert.ok(seedReportingDestinations.some((d) => d.status === status), `expected a seed destination with status "${status}"`);
  }
});

test("seed support organisations exercise every verification status at least once", () => {
  for (const status of VERIFICATION_STATUSES) {
    assert.ok(seedSupportOrganisations.some((o) => o.verificationStatus === status), `expected a seed organisation with verification status "${status}"`);
  }
});

test("seed support professionals exercise every verification status at least once", () => {
  for (const status of VERIFICATION_STATUSES) {
    assert.ok(seedSupportProfessionals.some((p) => p.verificationStatus === status), `expected a seed professional with verification status "${status}"`);
  }
});

test("seed data includes both a published verified and a published not-verified support organisation", () => {
  assert.ok(seedSupportOrganisations.some((o) => o.status === "published" && o.verificationStatus === "verified"));
  assert.ok(seedSupportOrganisations.some((o) => o.status === "published" && o.verificationStatus !== "verified"));
});

test("seed data includes both a published verified and a published not-verified professional", () => {
  assert.ok(seedSupportProfessionals.some((p) => p.status === "published" && p.verificationStatus === "verified"));
  assert.ok(seedSupportProfessionals.some((p) => p.status === "published" && p.verificationStatus !== "verified"));
});

test("seed data includes both an independent and an organisation-linked professional", () => {
  assert.ok(seedSupportProfessionals.some((p) => !p.organisationId));
  assert.ok(seedSupportProfessionals.some((p) => Boolean(p.organisationId)));
});

test("seed data includes both an advocate and a counsellor professional type", () => {
  assert.ok(seedSupportProfessionals.some((p) => p.professionalType === "advocate"));
  assert.ok(seedSupportProfessionals.some((p) => p.professionalType === "counsellor"));
});

test("every seed professional's organisationId (when set) resolves to a real seeded organisation", () => {
  const organisationIds = new Set(seedSupportOrganisations.map((o) => o.id));
  for (const professional of seedSupportProfessionals) {
    if (professional.organisationId) {
      assert.ok(organisationIds.has(professional.organisationId), `${professional.id} references a nonexistent organisation`);
    }
  }
});

test("seed reporting destinations exercise all three anonymous-reporting tri-state values", () => {
  assert.ok(seedReportingDestinations.some((d) => d.anonymousReporting === "yes"));
  assert.ok(seedReportingDestinations.some((d) => d.anonymousReporting === "no"));
  assert.ok(seedReportingDestinations.some((d) => d.anonymousReporting === "unknown"));
});

test("seed reporting destinations exercise both emergency-suitable and non-emergency records", () => {
  assert.ok(seedReportingDestinations.some((d) => d.emergencySuitability === "yes"));
  assert.ok(seedReportingDestinations.some((d) => d.emergencySuitability === "no"));
});

test("seed data includes an incomplete draft reporting destination with a reporting method missing its backing contact data", () => {
  const incomplete = seedReportingDestinations.find(
    (d) => d.status === "draft" && getUnsupportedReportingMethods(d).length > 0
  );
  assert.ok(incomplete, "expected an incomplete draft reporting destination with an unsupported reporting method");
});

test("a matching rule references a draft support organisation, professional, and reporting destination — demonstrating dependency protection", () => {
  const referencedOrgIds = new Set(seedMatchingRules.flatMap((r) => r.supportOrganisationIds));
  const referencedProfessionalIds = new Set(seedMatchingRules.flatMap((r) => r.supportProfessionalIds));
  const referencedDestinationIds = new Set(seedMatchingRules.flatMap((r) => r.reportingDestinationIds));

  assert.ok(seedSupportOrganisations.some((o) => o.status === "draft" && referencedOrgIds.has(o.id)));
  assert.ok(seedSupportProfessionals.some((p) => p.status === "draft" && referencedProfessionalIds.has(p.id)));
  assert.ok(seedReportingDestinations.some((d) => d.status === "draft" && referencedDestinationIds.has(d.id)));
});

test("seed data includes an unreferenced, fully-eligible draft for each Support Directory entity, safe to hard-delete", () => {
  const referencedOrgIds = new Set(seedMatchingRules.flatMap((r) => r.supportOrganisationIds));
  const referencedProfessionalIds = new Set(seedMatchingRules.flatMap((r) => r.supportProfessionalIds));
  const referencedDestinationIds = new Set(seedMatchingRules.flatMap((r) => r.reportingDestinationIds));

  const safeOrg = seedSupportOrganisations.find(
    (o) => o.status === "draft" && !referencedOrgIds.has(o.id) && getSupportOrganisationBlockers(o, directoryEligibilityContext).length === 0
  );
  assert.ok(safeOrg, "expected an unreferenced, fully-eligible draft support organisation");

  const safeProfessional = seedSupportProfessionals.find(
    (p) => p.status === "draft" && !referencedProfessionalIds.has(p.id) && getProfessionalBlockers(p, directoryEligibilityContext).length === 0
  );
  assert.ok(safeProfessional, "expected an unreferenced, fully-eligible draft professional");

  const safeDestination = seedReportingDestinations.find(
    (d) => d.status === "draft" && !referencedDestinationIds.has(d.id) && getDestinationBlockers(d, directoryEligibilityContext).length === 0
  );
  assert.ok(safeDestination, "expected an unreferenced, fully-eligible draft reporting destination");
});

test("seed data exercises multiple organisation types and destination types", () => {
  const organisationTypes = new Set(seedSupportOrganisations.map((o) => o.organisationType));
  assert.ok(organisationTypes.size >= 4, "expected demo organisations to span at least 4 different organisation types");

  const destinationTypes = new Set(seedReportingDestinations.map((d) => d.destinationType));
  assert.ok(destinationTypes.size >= 4, "expected demo destinations to span at least 4 different destination types");
});

test("seed data includes a review-overdue record for each Support Directory entity", () => {
  const referenceDate = new Date("2026-06-01T09:00:00.000Z");
  const isPast = (date: string | undefined) => Boolean(date) && new Date(date as string).getTime() < referenceDate.getTime();

  assert.ok(seedSupportOrganisations.some((o) => isPast(o.reviewDueDate)));
  assert.ok(seedSupportProfessionals.some((p) => isPast(p.nextReviewDate)));
  assert.ok(seedReportingDestinations.some((d) => isPast(d.reviewDueDate)));
});

test("the full seed dataset has no dangling support_organisation, support_professional, or reporting_destination references", () => {
  for (const kind of ["support_organisation", "support_professional", "reporting_destination"] as const) {
    assert.deepEqual(findDanglingTaxonomyReferences(kind, bundle), [], `unexpected dangling ${kind} reference(s) in seed data`);
  }
});

test("no real personal-sounding data: every seed contact email uses the reserved example.org domain", () => {
  for (const org of seedSupportOrganisations) {
    if (org.email) assert.match(org.email, /@example\.org$/);
  }
  for (const professional of seedSupportProfessionals) {
    if (professional.email) assert.match(professional.email, /@example\.org$/);
  }
});
