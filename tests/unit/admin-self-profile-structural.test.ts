import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

/**
 * Phase 8.4 — structural pins for the Admin self-profile route and its
 * header entry point. The Header previously rendered "Local Administrator"
 * as an inert `<span>` with no way to reach any profile, and there was no
 * self-profile route at all. These are source-text assertions (this
 * project's established convention — see content-export-bundle.test.ts and
 * friends — has no React rendering harness).
 */

const headerSource = readFileSync(
  path.join(__dirname, "../../src/components/layout/header.tsx"),
  "utf-8"
);
const profilePageSource = readFileSync(
  path.join(__dirname, "../../src/app/profile/page.tsx"),
  "utf-8"
);

test("the Header's account trigger is a real dropdown/link to /profile, not inert text", () => {
  assert.match(headerSource, /DropdownMenu/);
  assert.match(headerSource, /href=\{"\/profile" as Route\}/);
});

test("there is no 'Sign out' affordance in the Header — this app has no session to end", () => {
  assert.doesNotMatch(headerSource, /sign.?out/i);
  assert.doesNotMatch(headerSource, /log.?out/i);
});

test("the Admin Profile page never offers Admin registration, invitation, deletion, role-change, or a user-management view", () => {
  const forbidden = [
    /register.{0,20}admin/i,
    /invite.{0,20}admin/i,
    /create.{0,20}admin.{0,20}account/i,
    /delete account/i,
    /change role/i,
    /view all users/i,
  ];
  for (const pattern of forbidden) {
    assert.doesNotMatch(profilePageSource, pattern);
  }
});

test("the Admin Profile page's role summary is presented as fixed/read-only text, not an editable control", () => {
  assert.match(profilePageSource, /Role summary/);
  assert.doesNotMatch(profilePageSource, /<select[^>]*role/i);
});

test("preference persistence on the Admin Profile page uses truthful, local-only wording", () => {
  assert.match(profilePageSource, /Profile saved on this device\./);
  assert.doesNotMatch(profilePageSource, /profile updated on the server/i);
  assert.doesNotMatch(profilePageSource, /account synchroni[sz]ed/i);
});

test("no raw storage key or internal id is rendered as user-facing text on the Admin Profile page", () => {
  assert.doesNotMatch(profilePageSource, /local-admin-account/);
});

test("REGRESSION: no Admin registration/sign-up route or component exists anywhere under src/ (excluding legislation metadata fields that happen to contain the word)", () => {
  const srcDir = path.join(__dirname, "../../src");
  const offenders: string[] = [];

  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry)) continue;
      // Legislation content fields (step-governance/step-legal-scope/step-source) use
      // "registration"/"sign-up" as legal-document vocabulary, not an Admin auth feature.
      if (/[\\/]legislation[\\/]/.test(fullPath)) continue;
      if (/[\\/]app[\\/]profile[\\/]/.test(fullPath)) continue; // this page's own "no Admin sign-up" disclaimer
      if (/[\\/]models[\\/]admin-account\.ts$/.test(fullPath)) continue; // this model's own "no Admin registration" doc comment

      const contents = readFileSync(fullPath, "utf-8");
      if (/admin.{0,15}(registration|sign.?up|invite)/i.test(contents)) {
        offenders.push(fullPath);
      }
    }
  }

  walk(srcDir);
  assert.deepEqual(offenders, []);
});
