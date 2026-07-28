import assert from "node:assert/strict";
import test from "node:test";

import { deriveContactCapabilities, mailtoHref, telHref } from "../../src/lib/contact-capabilities";
import { initialsForName } from "../../src/lib/models/support-professional";

test("contact capabilities are only true when the underlying field is present", () => {
  const capabilities = deriveContactCapabilities({
    phone: "0000 000 010",
    email: "",
    bookingUrl: undefined,
    organisationWebsite: "https://example.org",
  });

  assert.deepEqual(capabilities, {
    canCall: true,
    canEmail: false,
    canBook: false,
    canVisitWebsite: true,
  });
});

test("whitespace-only contact fields do not count as present", () => {
  const capabilities = deriveContactCapabilities({
    phone: "   ",
    email: undefined,
    bookingUrl: undefined,
    organisationWebsite: undefined,
  });

  assert.equal(capabilities.canCall, false);
});

test("no contact methods on file produces every capability as false", () => {
  const capabilities = deriveContactCapabilities({
    phone: undefined,
    email: undefined,
    bookingUrl: undefined,
    organisationWebsite: undefined,
  });

  assert.deepEqual(capabilities, {
    canCall: false,
    canEmail: false,
    canBook: false,
    canVisitWebsite: false,
  });
});

test("telHref strips whitespace from a phone number", () => {
  assert.equal(telHref("0000 000 010"), "tel:0000000010");
});

test("mailtoHref wraps the address as-is", () => {
  assert.equal(mailtoHref("demo@example.org"), "mailto:demo@example.org");
});

test("initialsForName handles single and multi-word names", () => {
  assert.equal(initialsForName("Amina Farouk"), "AF");
  assert.equal(initialsForName("Cher"), "CH");
  assert.equal(initialsForName("  Priya   Chandran  "), "PC");
});

test("initialsForName falls back gracefully for an empty name", () => {
  assert.equal(initialsForName(""), "?");
});
