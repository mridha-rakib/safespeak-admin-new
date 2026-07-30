import assert from "node:assert/strict";
import test from "node:test";

import { createBaseFields } from "../../src/lib/models/base";
import { supportOrganisationSchema } from "../../src/lib/models/support-organisation";
import { supportProfessionalSchema } from "../../src/lib/models/support-professional";
import { reportingDestinationSchema } from "../../src/lib/models/reporting-destination";
import { verificationStatusSchema, VERIFICATION_STATUSES } from "../../src/lib/models/verification";
import { destinationTypeSchema, reportingMethodSchema, tristateSchema } from "../../src/lib/models/reporting-destination-type";
import { organisationTypeSchema } from "../../src/lib/models/organisation-type";
import { getUnsupportedReportingMethods, isReportingMethodSupported } from "../../src/lib/support-directory/reporting-method";
import { makeTestReportingDestination, makeTestSupportOrganisation, makeTestSupportProfessional } from "./helpers/taxonomy-data-bundle-fixture";

test("verificationStatusSchema accepts exactly the five verification states", () => {
  for (const status of VERIFICATION_STATUSES) {
    assert.equal(verificationStatusSchema.safeParse(status).success, true);
  }
  assert.equal(verificationStatusSchema.safeParse("pending_review").success, false, "old 3-state name should no longer validate");
});

test("supportOrganisationSchema rejects a record missing a required name", () => {
  assert.equal(supportOrganisationSchema.safeParse({ ...createBaseFields() }).success, false);
  assert.equal(supportOrganisationSchema.safeParse({ ...createBaseFields(), name: "Test Org" }).success, true);
});

test("supportOrganisationSchema defaults jurisdictions, australiaWide, verificationStatus, and emergencyService", () => {
  const parsed = supportOrganisationSchema.parse({ ...createBaseFields(), name: "Test Org" });
  assert.deepEqual(parsed.jurisdictions, []);
  assert.equal(parsed.australiaWide, false);
  assert.equal(parsed.verificationStatus, "not_verified");
  assert.equal(parsed.emergencyService, false);
  assert.deepEqual(parsed.resourceCategoryIds, []);
});

test("supportOrganisationSchema rejects a jurisdiction outside the typed Australian list", () => {
  const result = supportOrganisationSchema.safeParse({ ...createBaseFields(), name: "Test Org", jurisdictions: ["Not A Jurisdiction"] });
  assert.equal(result.success, false);
});

test("supportOrganisationSchema rejects an unsafe website URL", () => {
  const result = supportOrganisationSchema.safeParse({ ...createBaseFields(), name: "Test Org", website: "javascript:alert(1)" });
  assert.equal(result.success, false);
});

test("organisationTypeSchema accepts every documented organisation type", () => {
  for (const type of ["community_support", "legal_service", "crisis_support", "other"]) {
    assert.equal(organisationTypeSchema.safeParse(type).success, true);
  }
  assert.equal(organisationTypeSchema.safeParse("not_a_type").success, false);
});

test("supportProfessionalSchema rejects a record missing a required fullName or professionalType", () => {
  assert.equal(supportProfessionalSchema.safeParse({ ...createBaseFields() }).success, false);
  assert.equal(
    supportProfessionalSchema.safeParse({ ...createBaseFields(), fullName: "Test Person", professionalType: "advocate" }).success,
    true
  );
});

test("supportProfessionalSchema stores organisationId as a plain optional string (a stable id, not a name)", () => {
  const parsed = supportProfessionalSchema.parse({
    ...createBaseFields(),
    fullName: "Test Person",
    professionalType: "advocate",
    organisationId: "demo-org-1",
  });
  assert.equal(parsed.organisationId, "demo-org-1");
});

test("supportProfessionalSchema defaults verificationStatus to not_verified and resourceCategoryIds to empty", () => {
  const parsed = supportProfessionalSchema.parse({ ...createBaseFields(), fullName: "Test Person", professionalType: "counsellor" });
  assert.equal(parsed.verificationStatus, "not_verified");
  assert.deepEqual(parsed.resourceCategoryIds, []);
});

test("reportingDestinationSchema rejects a record missing a required name", () => {
  assert.equal(reportingDestinationSchema.safeParse({ ...createBaseFields() }).success, false);
  assert.equal(reportingDestinationSchema.safeParse({ ...createBaseFields(), name: "Test Destination" }).success, true);
});

test("reportingDestinationSchema defaults anonymousReporting and emergencySuitability to 'unknown', never a boolean-like default", () => {
  const parsed = reportingDestinationSchema.parse({ ...createBaseFields(), name: "Test Destination" });
  assert.equal(parsed.anonymousReporting, "unknown");
  assert.equal(parsed.emergencySuitability, "unknown");
});

test("destinationTypeSchema/reportingMethodSchema/tristateSchema accept only their documented values", () => {
  assert.equal(destinationTypeSchema.safeParse("police").success, true);
  assert.equal(destinationTypeSchema.safeParse("not_a_type").success, false);
  assert.equal(reportingMethodSchema.safeParse("online_form").success, true);
  assert.equal(reportingMethodSchema.safeParse("carrier_pigeon").success, false);
  assert.equal(tristateSchema.safeParse("yes").success, true);
  assert.equal(tristateSchema.safeParse("maybe").success, false);
});

test("isReportingMethodSupported requires the matching contact field for each method", () => {
  assert.equal(isReportingMethodSupported("phone", { phone: "0000 000 000" }), true);
  assert.equal(isReportingMethodSupported("phone", { phone: undefined }), false);
  assert.equal(isReportingMethodSupported("online_form", { onlineReportingUrl: "https://example.org/report" }), true);
  assert.equal(isReportingMethodSupported("online_form", { onlineReportingUrl: undefined }), false);
  assert.equal(isReportingMethodSupported("in_person", { address: "1 Demo Street" }), true);
  assert.equal(isReportingMethodSupported("in_person", { address: undefined }), false);
  assert.equal(isReportingMethodSupported("appointment", { bookingUrl: "https://example.org/book" }), true);
  assert.equal(isReportingMethodSupported("appointment", { reportingInstructions: "Call ahead to book." }), true);
  assert.equal(isReportingMethodSupported("appointment", {}), false);
  assert.equal(isReportingMethodSupported("other", {}), true);
});

test("getUnsupportedReportingMethods flags a selected method whose backing data is missing", () => {
  const record = makeTestReportingDestination({ reportingMethods: ["online_form", "phone"], phone: "0000 000 000", onlineReportingUrl: undefined });
  assert.deepEqual(getUnsupportedReportingMethods(record), ["online_form"]);
});

test("getUnsupportedReportingMethods is empty once every selected method's data is present", () => {
  const record = makeTestReportingDestination({ reportingMethods: ["phone"], phone: "0000 000 000" });
  assert.deepEqual(getUnsupportedReportingMethods(record), []);
});

test("fixture helpers produce schema-valid records for all three Support Directory entities", () => {
  assert.doesNotThrow(() => supportOrganisationSchema.parse(makeTestSupportOrganisation()));
  assert.doesNotThrow(() => supportProfessionalSchema.parse(makeTestSupportProfessional()));
  assert.doesNotThrow(() => reportingDestinationSchema.parse(makeTestReportingDestination()));
});
