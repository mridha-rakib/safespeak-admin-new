import { expect, test } from "@playwright/test";

/**
 * Critical smoke coverage for the Support Organisations module — the
 * golden path plus the verification-independent-of-publication and
 * dependency-protection rules, not a full historical regression suite. See
 * docs/ARCHITECTURE.md "Phase 5 testing scope."
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/content/support-organisations");
  await expect(page.getByRole("heading", { level: 1, name: "Support Organisations" })).toBeVisible();
});

test("seeded support organisations load into the management table", async ({ page }) => {
  const table = page.getByRole("table", { name: "Support organisations" });
  await expect(table).toBeVisible();
  await expect(table.getByText("Harborlight Community Support (Demo)")).toBeVisible();
  await expect(table.getByText("Coastal Legal Aid Clinic (Demo)")).toBeVisible();
});

test("Add Support Organisation navigates to the create form and shows a live user-facing preview", async ({ page }) => {
  await page.getByRole("link", { name: "Add Support Organisation" }).click();
  await expect(page).toHaveURL(/\/content\/support-organisations\/new$/);
  await expect(page.getByText("User-facing preview")).toBeVisible();

  await page.getByLabel("Organisation name").fill("Preview name check");
  await expect(page.getByText("Preview name check")).toBeVisible();
});

test("Ready for review and Publish stay disabled until every required field is set, then a full create-to-publish flow succeeds", async ({ page }) => {
  await page.goto("/content/support-organisations/new");
  await page.getByLabel("Organisation name").fill("Smoke test organisation");
  await page.getByLabel("Short description").fill("Short description for the smoke test organisation.");
  await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();

  await page.getByLabel("Organisation type").selectOption({ label: "Community support" });
  await page.getByLabel("Full service description").fill("Full service description for the smoke test organisation.");
  await page.getByRole("checkbox", { name: "Legal rights" }).check();
  await page.getByRole("checkbox", { name: "New South Wales" }).check();
  await page.getByRole("textbox", { name: "Phone" }).fill("0000 000 000");
  await page.getByLabel("Review due date").fill("2027-01-01");

  await expect(page.getByRole("button", { name: "Publish" })).toBeEnabled();
  await page.getByRole("button", { name: "Publish" }).click();

  await expect(page).toHaveURL(/\/content\/support-organisations\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Smoke test organisation" })).toBeVisible();
  await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();
});

test("marking Australia-wide satisfies the jurisdiction requirement without selecting a specific jurisdiction", async ({ page }) => {
  await page.goto("/content/support-organisations/new");
  await page.getByLabel("Organisation name").fill("Australia-wide smoke test");
  await page.getByLabel("Short description").fill("Short description.");
  await page.getByLabel("Organisation type").selectOption({ label: "Crisis support" });
  await page.getByLabel("Full service description").fill("Full description.");
  await page.getByRole("checkbox", { name: "Legal rights" }).check();
  await page.getByRole("textbox", { name: "Phone" }).fill("0000 000 000");
  await page.getByLabel("Review due date").fill("2027-01-01");
  await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();

  await page.getByRole("checkbox", { name: "Australia-wide service" }).check();
  await expect(page.getByRole("button", { name: "Publish" })).toBeEnabled();
});

test("a published but not-verified organisation shows a clear warning that publication does not imply verification", async ({ page }) => {
  await page.goto("/content/support-organisations/demo-org-riverside-crisis-line");
  await expect(page.getByText("Not verified").first()).toBeVisible();
  await expect(page.getByText("Publication does not imply verification.")).toBeVisible();
});

test("editing an existing organisation preloads its saved values", async ({ page }) => {
  await page.goto("/content/support-organisations/demo-org-harborlight-community-support/edit");
  await expect(page.getByLabel("Organisation name")).toHaveValue("Harborlight Community Support (Demo)");
});

test("a referenced draft organisation cannot be hard-deleted; an unreferenced eligible draft can", async ({ page }) => {
  await page.goto("/content/support-organisations/demo-org-northside-cultural-wellbeing");
  await expect(page.getByRole("heading", { level: 1, name: "Northside Cultural Wellbeing Centre (Demo)" })).toBeVisible();
  await page.getByRole("button", { name: "Delete draft" }).click();
  await page.getByRole("dialog", { name: "Delete this draft?" }).getByRole("button", { name: "Delete draft" }).click();
  await expect(page.getByText(/used by \d+ other record/i)).toBeVisible();
  await expect(page).toHaveURL(/\/content\/support-organisations\/demo-org-northside-cultural-wellbeing$/);

  await page.goto("/content/support-organisations/demo-org-fully-eligible-unreferenced-draft");
  await page.getByRole("button", { name: "Delete draft" }).click();
  await page.getByRole("dialog", { name: "Delete this draft?" }).getByRole("button", { name: "Delete draft" }).click();
  await expect(page).toHaveURL(/\/content\/support-organisations$/);
});

test("the Review Queue lists a ready-for-review organisation with a View link back to it", async ({ page }) => {
  await page.goto("/publishing/review-queue");
  const row = page.getByRole("row", { name: /Westside Housing Support Service/ });
  await expect(row).toBeVisible();
  await expect(row.getByRole("link", { name: "View" })).toHaveAttribute("href", "/content/support-organisations/demo-org-westside-housing-support");
});

test("the Dashboard's published-organisations stat card links to the Support Organisations module", async ({ page }) => {
  await page.goto("/dashboard");
  const card = page.getByRole("main").getByRole("link", { name: /published support organisations/i });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/content\/support-organisations$/);
});
