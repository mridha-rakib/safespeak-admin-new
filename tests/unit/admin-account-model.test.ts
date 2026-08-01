import assert from "node:assert/strict";
import test from "node:test";

import { ADMIN_ACCOUNT_ID, adminAccountSchema } from "../../src/lib/models/admin-account";
import { getPersonInitials } from "../../src/lib/person-identity";

/**
 * Phase 8.4 — the logged-in Admin's own self-profile record: a singleton
 * row (same shape of pattern as AppSettings/APP_SETTINGS_ID), never a
 * multi-row Admin directory. There is no Admin registration in this phase,
 * so this schema only ever describes how the one local administrator is
 * addressed in this browser — never a role, permission, or login field.
 */

test("adminAccountSchema defaults id to the singleton ADMIN_ACCOUNT_ID and displayName to 'Local Administrator'", () => {
  const parsed = adminAccountSchema.parse({ updatedAt: "2026-01-01T00:00:00.000Z" });
  assert.equal(parsed.id, ADMIN_ACCOUNT_ID);
  assert.equal(parsed.displayName, "Local Administrator");
  assert.equal(parsed.contactEmail, undefined);
});

test("adminAccountSchema rejects an empty display name", () => {
  const result = adminAccountSchema.safeParse({
    displayName: "",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(result.success, false);
});

test("adminAccountSchema rejects any id other than the singleton ADMIN_ACCOUNT_ID — there is no second admin row", () => {
  const result = adminAccountSchema.safeParse({
    id: "some-other-admin",
    displayName: "Someone Else",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(result.success, false);
});

test("adminAccountSchema accepts an explicit contactEmail and preserves it verbatim", () => {
  const parsed = adminAccountSchema.parse({
    displayName: "Priya N.",
    contactEmail: "priya@example.org",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(parsed.contactEmail, "priya@example.org");
});

test("adminAccountSchema has no role, permission, or login field — role is a fixed UI label, not stored data", () => {
  const shape = adminAccountSchema.shape;
  assert.equal("role" in shape, false);
  assert.equal("permissions" in shape, false);
  assert.equal("password" in shape, false);
  assert.equal("isVerified" in shape, false);
});

test("getPersonInitials falls back to 'LA' for the default 'Local Administrator' label", () => {
  assert.equal(getPersonInitials("Local Administrator"), "LA");
});

test("getPersonInitials falls back to the default label's initials when given no name at all", () => {
  assert.equal(getPersonInitials(undefined), "LA");
  assert.equal(getPersonInitials(null), "LA");
  assert.equal(getPersonInitials("   "), "LA");
});

test("getPersonInitials takes the first letter of the first two words of a real display name", () => {
  assert.equal(getPersonInitials("Priya Nair"), "PN");
});
