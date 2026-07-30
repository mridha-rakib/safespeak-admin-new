import assert from "node:assert/strict";
import test from "node:test";

import { getSupportOrganisationBlockers } from "../../src/lib/support-directory/support-organisation-eligibility";
import { getProfessionalBlockers } from "../../src/lib/support-directory/professional-eligibility";
import { getDestinationBlockers } from "../../src/lib/support-directory/destination-eligibility";
import { makeTestReportingDestination, makeTestSupportOrganisation, makeTestSupportProfessional } from "./helpers/taxonomy-data-bundle-fixture";
import { makeTestResourceCategory } from "./helpers/taxonomy-fixture";

function fullyEligibleOrganisation() {
  return makeTestSupportOrganisation({
    name: "Test Org",
    organisationType: "community_support",
    shortDescription: "Short description",
    fullDescription: "Full description",
    resourceCategoryIds: ["rc-1"],
    jurisdictions: ["nsw"],
    phone: "0000 000 000",
    reviewDueDate: "2027-01-01",
  });
}

test("a fully-eligible support organisation has no publish blockers", () => {
  const context = { resourceCategories: [makeTestResourceCategory({ id: "rc-1" })] };
  assert.deepEqual(getSupportOrganisationBlockers(fullyEligibleOrganisation(), context), []);
});

test("support organisation publish is blocked without name, type, descriptions, or review due date", () => {
  const context = { resourceCategories: [makeTestResourceCategory({ id: "rc-1" })] };
  assert.ok(getSupportOrganisationBlockers(makeTestSupportOrganisation({ name: "" }), context).some((b) => /name/i.test(b)));
  assert.ok(getSupportOrganisationBlockers({ ...fullyEligibleOrganisation(), organisationType: undefined }, context).some((b) => /type/i.test(b)));
  assert.ok(getSupportOrganisationBlockers({ ...fullyEligibleOrganisation(), reviewDueDate: undefined }, context).some((b) => /review due date/i.test(b)));
});

test("support organisation publish requires at least one resource category, and flags a dangling one", () => {
  const withoutCategory = { ...fullyEligibleOrganisation(), resourceCategoryIds: [] };
  assert.ok(getSupportOrganisationBlockers(withoutCategory, { resourceCategories: [] }).some((b) => /resource category is required/i.test(b)));

  const dangling = fullyEligibleOrganisation();
  assert.ok(getSupportOrganisationBlockers(dangling, { resourceCategories: [] }).some((b) => /no longer exist/i.test(b)));
});

test("support organisation publish requires a jurisdiction unless marked Australia-wide", () => {
  const context = { resourceCategories: [makeTestResourceCategory({ id: "rc-1" })] };
  const noJurisdiction = { ...fullyEligibleOrganisation(), jurisdictions: [] };
  assert.ok(getSupportOrganisationBlockers(noJurisdiction, context).some((b) => /jurisdiction/i.test(b)));

  const australiaWide = { ...fullyEligibleOrganisation(), jurisdictions: [], australiaWide: true };
  assert.deepEqual(getSupportOrganisationBlockers(australiaWide, context), []);
});

test("support organisation publish requires at least one valid contact channel", () => {
  const context = { resourceCategories: [makeTestResourceCategory({ id: "rc-1" })] };
  const noContact = { ...fullyEligibleOrganisation(), phone: undefined };
  assert.ok(getSupportOrganisationBlockers(noContact, context).some((b) => /contact channel/i.test(b)));
});

test("support organisation eligibility never checks verificationStatus — a Not Verified organisation can have zero blockers", () => {
  const context = { resourceCategories: [makeTestResourceCategory({ id: "rc-1" })] };
  const record = { ...fullyEligibleOrganisation(), verificationStatus: "not_verified" as const };
  assert.deepEqual(getSupportOrganisationBlockers(record, context), []);
});

function fullyEligibleProfessional() {
  return makeTestSupportProfessional({
    fullName: "Test Person",
    shortIntroduction: "Short intro",
    fullBiography: "Full biography",
    resourceCategoryIds: ["rc-1"],
    jurisdictions: ["nsw"],
    phone: "0000 000 000",
    nextReviewDate: "2027-01-01",
  });
}

test("a fully-eligible professional has no publish blockers", () => {
  const context = { resourceCategories: [makeTestResourceCategory({ id: "rc-1" })], supportOrganisations: [] };
  assert.deepEqual(getProfessionalBlockers(fullyEligibleProfessional(), context), []);
});

test("professional publish accepts a specialisation in place of a resource category", () => {
  const context = { resourceCategories: [], supportOrganisations: [] };
  const record = { ...fullyEligibleProfessional(), resourceCategoryIds: [], specialisations: ["Trauma-informed"] };
  assert.deepEqual(getProfessionalBlockers(record, context), []);
});

test("professional publish is blocked without a resource category or specialisation", () => {
  const context = { resourceCategories: [], supportOrganisations: [] };
  const record = { ...fullyEligibleProfessional(), resourceCategoryIds: [], specialisations: [] };
  assert.ok(getProfessionalBlockers(record, context).some((b) => /resource category or specialisation/i.test(b)));
});

test("professional publish does not require an organisation — an independent professional may publish", () => {
  const context = { resourceCategories: [makeTestResourceCategory({ id: "rc-1" })], supportOrganisations: [] };
  const record = { ...fullyEligibleProfessional(), organisationId: undefined };
  assert.deepEqual(getProfessionalBlockers(record, context), []);
});

test("professional publish is blocked by a dangling organisation reference", () => {
  const context = { resourceCategories: [makeTestResourceCategory({ id: "rc-1" })], supportOrganisations: [] };
  const record = { ...fullyEligibleProfessional(), organisationId: "missing-org" };
  assert.ok(getProfessionalBlockers(record, context).some((b) => /organisation no longer exists/i.test(b)));
});

test("professional publish accepts a valid organisation link as the contact path when there is no direct contact", () => {
  const org = makeTestSupportOrganisation({ id: "org-1" });
  const context = { resourceCategories: [makeTestResourceCategory({ id: "rc-1" })], supportOrganisations: [org] };
  const record = { ...fullyEligibleProfessional(), phone: undefined, email: undefined, bookingUrl: undefined, organisationWebsite: undefined, organisationId: "org-1" };
  assert.deepEqual(getProfessionalBlockers(record, context), []);
});

test("professional publish is blocked without any direct contact or organisation referral path", () => {
  const context = { resourceCategories: [makeTestResourceCategory({ id: "rc-1" })], supportOrganisations: [] };
  const record = { ...fullyEligibleProfessional(), phone: undefined, email: undefined, bookingUrl: undefined, organisationWebsite: undefined, organisationId: undefined };
  assert.ok(getProfessionalBlockers(record, context).some((b) => /contact method/i.test(b)));
});

test("professional eligibility never checks verificationStatus — a Not Verified professional can have zero blockers", () => {
  const context = { resourceCategories: [makeTestResourceCategory({ id: "rc-1" })], supportOrganisations: [] };
  const record = { ...fullyEligibleProfessional(), verificationStatus: "not_verified" as const };
  assert.deepEqual(getProfessionalBlockers(record, context), []);
});

function fullyEligibleDestination() {
  return makeTestReportingDestination({
    name: "Test Destination",
    destinationType: "police",
    description: "Short description",
    jurisdictions: ["nsw"],
    reportingMethods: ["phone"],
    phone: "0000 000 000",
    reportingInstructions: "Call this number.",
    reviewDueDate: "2027-01-01",
  });
}

test("a fully-eligible reporting destination has no publish blockers", () => {
  const context = { resourceCategories: [], supportOrganisations: [] };
  assert.deepEqual(getDestinationBlockers(fullyEligibleDestination(), context), []);
});

test("reporting destination publish requires at least one reporting method", () => {
  const context = { resourceCategories: [], supportOrganisations: [] };
  const record = { ...fullyEligibleDestination(), reportingMethods: [] };
  assert.ok(getDestinationBlockers(record, context).some((b) => /reporting method is required/i.test(b)));
});

test("reporting destination publish is blocked when a selected method's contact data is missing", () => {
  const context = { resourceCategories: [], supportOrganisations: [] };
  const record = { ...fullyEligibleDestination(), reportingMethods: ["online_form" as const], onlineReportingUrl: undefined };
  assert.ok(getDestinationBlockers(record, context).some((b) => /online form/i.test(b)));
});

test("reporting destination publish requires clear reporting instructions", () => {
  const context = { resourceCategories: [], supportOrganisations: [] };
  const record = { ...fullyEligibleDestination(), reportingInstructions: undefined };
  assert.ok(getDestinationBlockers(record, context).some((b) => /instructions/i.test(b)));
});

test("reporting destination publish requires a jurisdiction unless marked Australia-wide", () => {
  const context = { resourceCategories: [], supportOrganisations: [] };
  const record = { ...fullyEligibleDestination(), jurisdictions: [] };
  assert.ok(getDestinationBlockers(record, context).some((b) => /jurisdiction/i.test(b)));

  const australiaWide = { ...fullyEligibleDestination(), jurisdictions: [], australiaWide: true };
  assert.deepEqual(getDestinationBlockers(australiaWide, context), []);
});

test("reporting destination publish is blocked by a dangling organisation reference", () => {
  const context = { resourceCategories: [], supportOrganisations: [] };
  const record = { ...fullyEligibleDestination(), organisationId: "missing-org" };
  assert.ok(getDestinationBlockers(record, context).some((b) => /organisation no longer exists/i.test(b)));
});

test("reporting destination publish does not require anonymousReporting/emergencySuitability to be anything other than the default 'unknown'", () => {
  const context = { resourceCategories: [], supportOrganisations: [] };
  const record = { ...fullyEligibleDestination(), anonymousReporting: "unknown" as const, emergencySuitability: "unknown" as const };
  assert.deepEqual(getDestinationBlockers(record, context), []);
});
