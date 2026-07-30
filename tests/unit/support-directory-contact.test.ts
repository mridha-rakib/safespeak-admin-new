import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanOptionalText,
  deriveDestinationContactCapabilities,
  deriveOrganisationContactCapabilities,
  deriveProfessionalContactCapabilities,
  isInsecureHttpUrl,
  isSafeUrl,
  isValidEmailValue,
  mailtoHref,
  telHref,
} from "../../src/lib/support-directory/contact";
import { isCurrentlyVerified, isVerificationExpired } from "../../src/lib/models/verification";
import { initialsForName } from "../../src/lib/models/support-professional";

test("isSafeUrl accepts http and https URLs only", () => {
  assert.equal(isSafeUrl("https://example.org"), true);
  assert.equal(isSafeUrl("http://example.org"), true);
  assert.equal(isSafeUrl("ftp://example.org"), false);
  assert.equal(isSafeUrl("javascript:alert(1)"), false);
  assert.equal(isSafeUrl("data:text/html,<script>alert(1)</script>"), false);
  assert.equal(isSafeUrl(""), false);
  assert.equal(isSafeUrl(undefined), false);
  assert.equal(isSafeUrl("not a url"), false);
});

test("isInsecureHttpUrl flags http but not https", () => {
  assert.equal(isInsecureHttpUrl("http://example.org"), true);
  assert.equal(isInsecureHttpUrl("https://example.org"), false);
  assert.equal(isInsecureHttpUrl(undefined), false);
});

test("isValidEmailValue rejects malformed addresses and accepts well-formed ones", () => {
  assert.equal(isValidEmailValue("demo@example.org"), true);
  assert.equal(isValidEmailValue("not-an-email"), false);
  assert.equal(isValidEmailValue(""), false);
  assert.equal(isValidEmailValue(undefined), false);
  assert.equal(isValidEmailValue("   "), false);
});

test("cleanOptionalText trims and converts blank input to undefined", () => {
  assert.equal(cleanOptionalText("  hello  "), "hello");
  assert.equal(cleanOptionalText("   "), undefined);
  assert.equal(cleanOptionalText(""), undefined);
});

test("telHref strips whitespace from a phone number", () => {
  assert.equal(telHref("0000 000 010"), "tel:0000000010");
});

test("mailtoHref wraps the address as-is", () => {
  assert.equal(mailtoHref("demo@example.org"), "mailto:demo@example.org");
});

test("organisation contact capabilities are only true when the underlying field is valid", () => {
  const capabilities = deriveOrganisationContactCapabilities({
    phone: "0000 000 001",
    email: "not-valid",
    website: "https://example.org",
    bookingUrl: undefined,
    referralUrl: "javascript:alert(1)",
  });

  assert.deepEqual(capabilities, {
    canCall: true,
    canEmail: false,
    canVisitWebsite: true,
    canBook: false,
    canRefer: false,
  });
});

test("organisation with no contact fields has every capability false", () => {
  const capabilities = deriveOrganisationContactCapabilities({});
  assert.deepEqual(capabilities, {
    canCall: false,
    canEmail: false,
    canVisitWebsite: false,
    canBook: false,
    canRefer: false,
  });
});

test("professional contact capabilities derive from phone/email/bookingUrl/organisationWebsite", () => {
  const capabilities = deriveProfessionalContactCapabilities({
    phone: "   ",
    email: "amina.demo@example.org",
    bookingUrl: "https://example.org/book",
    organisationWebsite: undefined,
  });

  assert.deepEqual(capabilities, {
    canCall: false,
    canEmail: true,
    canBook: true,
    canVisitWebsite: false,
  });
});

test("destination contact capabilities include online reporting and appointment booking", () => {
  const capabilities = deriveDestinationContactCapabilities({
    phone: undefined,
    email: undefined,
    website: undefined,
    onlineReportingUrl: "https://example.org/report",
    bookingUrl: "https://example.org/book",
  });

  assert.deepEqual(capabilities, {
    canCall: false,
    canEmail: false,
    canVisitWebsite: false,
    canReportOnline: true,
    canBookAppointment: true,
  });
});

test("initialsForName handles single and multi-word names", () => {
  assert.equal(initialsForName("Amina Farouk"), "AF");
  assert.equal(initialsForName("Cher"), "CH");
  assert.equal(initialsForName("  Priya   Chandran  "), "PC");
});

test("initialsForName falls back gracefully for an empty name", () => {
  assert.equal(initialsForName(""), "?");
});

test("isCurrentlyVerified is true only for the 'verified' status", () => {
  assert.equal(isCurrentlyVerified("verified"), true);
  assert.equal(isCurrentlyVerified("not_verified"), false);
  assert.equal(isCurrentlyVerified("verification_pending"), false);
  assert.equal(isCurrentlyVerified("verification_expired"), false);
  assert.equal(isCurrentlyVerified("verification_rejected"), false);
});

test("isVerificationExpired compares against a supplied reference date and is false when unset", () => {
  const referenceDate = new Date("2026-06-01T09:00:00.000Z");
  assert.equal(isVerificationExpired("2026-01-01", referenceDate), true);
  assert.equal(isVerificationExpired("2027-01-01", referenceDate), false);
  assert.equal(isVerificationExpired(undefined, referenceDate), false);
  assert.equal(isVerificationExpired("not-a-date", referenceDate), false);
});
