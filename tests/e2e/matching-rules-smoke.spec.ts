import { expect, test } from "@playwright/test";

/**
 * Critical smoke coverage for the Matching Rules module — the golden path
 * plus the eligibility rules and the deterministic Test Matching preview
 * that are easy to silently break, not a full historical regression suite.
 * Mirrors tests/e2e/microcards-smoke.spec.ts's structure/conventions.
 *
 * Depends on the concurrently-developed matching-rule model/repository/
 * eligibility/seed data landing first (see Phase 6 task split) — this file
 * is written correctly against that documented interface and the demo
 * records already present in lib/db/seed.ts's `seedMatchingRulesRaw`, but
 * has not been run yet. Run it once integration is complete.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/taxonomy/matching-rules");
  await expect(page.getByRole("heading", { level: 1, name: "Matching Rules" })).toBeVisible();
});

test("seeded matching rules load into the management table", async ({ page }) => {
  const table = page.getByRole("table", { name: "Matching Rules" });
  await expect(table).toBeVisible();

  // Phase 6.1 added 5 more Published Enabled baseline rules (14 seeded rules
  // total now, default page size 10) — search first so this assertion isn't
  // sensitive to which page a given row happens to land on.
  await page.getByPlaceholder("Search matching rules...").fill("Domestic violence");
  await expect(table.getByText("Domestic violence → safety planning & support (demo)")).toBeVisible();

  await page.getByPlaceholder("Search matching rules...").fill("Racial abuse");
  await expect(table.getByText("Racial abuse → know your rights & report (demo)")).toBeVisible();
});

test("search narrows the table to matching rows", async ({ page }) => {
  await page.getByPlaceholder("Search matching rules...").fill("Housing crisis");
  const table = page.getByRole("table", { name: "Matching Rules" });
  await expect(table.getByText("Housing crisis → referral pathway (demo, needs update)")).toBeVisible();
  await expect(table.getByText("Domestic violence → safety planning & support (demo)")).toHaveCount(0);
});

test("the Enabled filter narrows the table to disabled rules", async ({ page }) => {
  await page.getByLabel("Enabled").selectOption("disabled_only");
  const table = page.getByRole("table", { name: "Matching Rules" });
  await expect(table.getByText("Cyber scam → reporting & protection basics (demo)")).toBeVisible();
  await expect(table.getByText("Domestic violence → safety planning & support (demo)")).toHaveCount(0);
});

test("Add matching rule navigates to the create form", async ({ page }) => {
  await page.getByRole("link", { name: "Add matching rule" }).click();
  await expect(page).toHaveURL(/\/taxonomy\/matching-rules\/new$/);
  await expect(page.getByRole("heading", { level: 1, name: "Add matching rule" })).toBeVisible();
});

test("an incomplete draft can be saved and persists after a reload", async ({ page }) => {
  await page.goto("/taxonomy/matching-rules/new");
  await page.getByLabel("Rule name").fill("Smoke test rule");
  await page.getByRole("button", { name: "Save as draft" }).click();

  await expect(page).toHaveURL(/\/taxonomy\/matching-rules\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Smoke test rule" })).toBeVisible();
  await expect(page.getByText("Draft", { exact: true }).first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Smoke test rule" })).toBeVisible();
});

test("Ready for review and Publish stay disabled until every required field is set, then a full create-to-publish flow succeeds", async ({
  page,
}) => {
  await page.goto("/taxonomy/matching-rules/new");
  await page.getByLabel("Rule name").fill("Smoke test publish rule");
  await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();

  await page.getByLabel("Description").fill("Smoke test rule description.");
  await page.getByLabel("Review due date").fill("2027-01-01");
  await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();

  // At least one match condition is required.
  await page.getByRole("checkbox", { name: "General Assistant" }).check();
  await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();

  // At least one recommendation is required — "Quick safety planning tip" is
  // a seeded, published microcard (already used by the domestic-violence demo rule).
  await page.getByRole("checkbox", { name: "Quick safety planning tip" }).check();

  await expect(page.getByRole("button", { name: "Publish" })).toBeEnabled();
  await page.getByRole("button", { name: "Publish" }).click();

  await expect(page).toHaveURL(/\/taxonomy\/matching-rules\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Smoke test publish rule" })).toBeVisible();
  await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();
});

test("editing an existing matching rule preloads its saved values, and the machine key is locked", async ({ page }) => {
  await page.goto("/taxonomy/matching-rules/demo-rule-domestic-violence-safety-support/edit");
  await expect(page.getByLabel("Rule name")).toHaveValue("Domestic violence → safety planning & support (demo)");
  await expect(page.getByLabel("Stable key")).toHaveValue("domestic_violence_safety_support");
  await expect(page.getByLabel("Stable key")).not.toBeEditable();
});

test("a draft matching rule with a dangling condition reference shows the blocker and stays blocked from Ready for review", async ({
  page,
}) => {
  await page.goto("/taxonomy/matching-rules/demo-rule-general-assistant-orientation/edit");
  await expect(page.getByText(/resource category condition reference/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark ready for review" })).toBeDisabled();

  await page.goto("/taxonomy/matching-rules/demo-rule-general-assistant-orientation");
  await expect(page.getByRole("button", { name: "Move to ready for review" })).toBeDisabled();
});

test("disabling a published rule and re-enabling it updates the detail page", async ({ page }) => {
  await page.goto("/taxonomy/matching-rules/demo-rule-racial-abuse-know-your-rights");
  await expect(page.getByText("Enabled", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Disable" }).click();
  await expect(page.getByText("Disabled", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Enable" }).click();
  await expect(page.getByText("Enabled", { exact: true }).first()).toBeVisible();
});

test("Test Matching returns recommendations for a context matching the rule's own conditions, and highlights this rule", async ({
  page,
}) => {
  await page.goto("/taxonomy/matching-rules/demo-rule-domestic-violence-safety-support");
  await expect(page.getByRole("heading", { name: "Test matching" })).toBeVisible();

  await page.getByLabel("Assistant topic").selectOption({ label: "Domestic Violence" });
  await page.getByLabel("Jurisdiction").selectOption({ label: "New South Wales" });
  await page.getByLabel("Urgency").selectOption({ label: "High" });

  await page.getByRole("button", { name: "Run test match" }).click();

  await expect(page.getByText("Triggered rules")).toBeVisible();
  // Exact match: Phase 6.1 added demo-rule-domestic-violence-baseline-support,
  // a topic-only rule that also triggers for this same context and
  // contributes its own "This rule has no jurisdiction condition, so it
  // applies Australia-wide" reason text — a loose substring match on "This
  // rule" is ambiguous against that text, so the badge itself needs `exact`.
  await expect(page.getByText("This rule", { exact: true })).toBeVisible();
  // `.first()`: with demo-rule-domestic-violence-baseline-support (Phase 6.1)
  // also triggering for this context and recommending the same microcard,
  // its name now legitimately appears twice (a summary line and the list
  // item) — either occurrence proves the recommendation resolved.
  await expect(page.getByText("Quick safety planning tip").first()).toBeVisible();
});

test("running Test Matching records an audit activity entry", async ({ page }) => {
  await page.goto("/taxonomy/matching-rules/demo-rule-migrant-challenges-orientation");
  await page.getByRole("button", { name: "Run test match" }).click();

  const table = page.getByRole("table", { name: /Audit activity/ });
  await expect(table.getByText(/Ran Test Matching preview/)).toBeVisible();
});

test("an eligible draft matching rule can be permanently deleted", async ({ page }) => {
  await page.goto("/taxonomy/matching-rules/demo-rule-workplace-discrimination-legal");
  await expect(page.getByRole("heading", { level: 1, name: /Workplace discrimination/ })).toBeVisible();
  await page.getByRole("button", { name: "Delete draft" }).click();
  await page.getByRole("dialog", { name: "Delete this draft?" }).getByRole("button", { name: "Delete draft" }).click();
  await expect(page).toHaveURL(/\/taxonomy\/matching-rules$/);
});

test("a recommendation that is no longer published blocks Ready for review on an existing rule (needs_update demo rule)", async ({
  page,
}) => {
  // demo-rule-housing-support-referral recommends an organisation AND a
  // destination that are no longer published — two separate blocker list
  // items both contain this substring, so a loose text match is ambiguous;
  // `.first()` is enough to confirm at least one is shown.
  await page.goto("/taxonomy/matching-rules/demo-rule-housing-support-referral/edit");
  await expect(page.getByText(/are not published and cannot be used in a live matching rule/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark ready for review" })).toBeDisabled();
});
