import { expect, test } from "@playwright/test";

/**
 * Critical smoke coverage for the Advocates & Counsellors module — the
 * golden path plus the verification-independent-of-publication rule and
 * dependency protection, not a full historical regression suite. See
 * docs/ARCHITECTURE.md "Phase 5 testing scope."
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/content/advocates-counsellors");
  await expect(page.getByRole("heading", { level: 1, name: "Advocates & Counsellors" })).toBeVisible();
});

test("seeded professionals load into the management table", async ({ page }) => {
  const table = page.getByRole("table", { name: "Advocates & Counsellors" });
  await expect(table).toBeVisible();
  // Amina's row shows her displayName ("Amina F."), not her fullName — the
  // list column deliberately prefers displayName when set (see
  // components/advocates-counsellors/columns.tsx).
  await expect(table.getByText("Amina F.", { exact: true })).toBeVisible();
  await expect(table.getByText("Daniel Osei")).toBeVisible();
});

test("Add Advocate or Counsellor navigates to the create form, shows initials fallback and a live preview", async ({ page }) => {
  await page.getByRole("link", { name: "Add Advocate or Counsellor" }).click();
  await expect(page).toHaveURL(/\/content\/advocates-counsellors\/new$/);
  await expect(page.getByText("User-facing preview")).toBeVisible();
  await expect(page.getByText("Upload image")).toBeVisible();

  await page.getByLabel("Full name").fill("Preview Name");
  await expect(page.getByText("Preview Name", { exact: true })).toBeVisible();
  // No image uploaded — initials fallback shown, never a broken/missing image.
  await expect(page.getByText("PN", { exact: true })).toBeVisible();
});

test("Ready for review and Publish stay disabled until every required field is set, then a full create-to-publish flow succeeds", async ({ page }) => {
  await page.goto("/content/advocates-counsellors/new");
  await page.getByLabel("Full name").fill("Smoke Test Professional");
  await page.getByLabel("Short summary").fill("Short summary for the smoke test professional.");
  await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();

  await page.getByLabel("Full biography / service description").fill("Full biography for the smoke test professional.");
  await page.getByRole("checkbox", { name: "Legal rights" }).check();
  await page.getByRole("checkbox", { name: "New South Wales" }).check();
  await page.getByRole("textbox", { name: "Phone" }).fill("0000 000 000");
  await page.getByLabel("Review due date").fill("2027-01-01");

  await expect(page.getByRole("button", { name: "Publish" })).toBeEnabled();
  await page.getByRole("button", { name: "Publish" }).click();

  await expect(page).toHaveURL(/\/content\/advocates-counsellors\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Smoke Test Professional" })).toBeVisible();
  await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();
});

test("an independent professional (no organisation) can still publish", async ({ page }) => {
  await page.goto("/content/advocates-counsellors/new");
  await page.getByLabel("Full name").fill("Independent Smoke Test");
  await page.getByLabel("Short summary").fill("Short summary.");
  await page.getByLabel("Full biography / service description").fill("Full biography.");
  await page.getByRole("checkbox", { name: "Legal rights" }).check();
  await page.getByRole("checkbox", { name: "New South Wales" }).check();
  await page.getByLabel("Review due date").fill("2027-01-01");
  await expect(page.getByLabel("Organisation (optional")).toHaveValue("");

  await page.getByRole("textbox", { name: "Phone" }).fill("0000 000 000");
  await expect(page.getByRole("button", { name: "Publish" })).toBeEnabled();
});

test("a published but not-verified professional shows a clear warning that publication does not imply verification", async ({ page }) => {
  await page.goto("/content/advocates-counsellors/demo-advocate-daniel-osei");
  await expect(page.getByText("Not verified").first()).toBeVisible();
  await expect(page.getByText("Publication does not imply verification.")).toBeVisible();
});

test("editing an existing professional preloads its saved values", async ({ page }) => {
  await page.goto("/content/advocates-counsellors/demo-advocate-amina-farouk/edit");
  await expect(page.getByLabel("Full name")).toHaveValue("Amina Farouk");
});

test("a professional linked to an organisation shows that organisation on its detail page", async ({ page }) => {
  await page.goto("/content/advocates-counsellors/demo-advocate-amina-farouk");
  await expect(page.getByRole("link", { name: "Harborlight Community Support (Demo)" })).toBeVisible();
});

test("a referenced draft professional cannot be hard-deleted; an unreferenced eligible draft can", async ({ page }) => {
  await page.goto("/content/advocates-counsellors/demo-advocate-priya-chandran");
  await expect(page.getByRole("heading", { level: 1, name: "Priya Chandran" })).toBeVisible();
  await page.getByRole("button", { name: "Delete draft" }).click();
  await page.getByRole("dialog", { name: "Delete this draft?" }).getByRole("button", { name: "Delete draft" }).click();
  await expect(page.getByText(/used by \d+ other record/i)).toBeVisible();
  await expect(page).toHaveURL(/\/content\/advocates-counsellors\/demo-advocate-priya-chandran$/);

  await page.goto("/content/advocates-counsellors/demo-counsellor-fully-eligible-draft");
  await page.getByRole("button", { name: "Delete draft" }).click();
  await page.getByRole("dialog", { name: "Delete this draft?" }).getByRole("button", { name: "Delete draft" }).click();
  await expect(page).toHaveURL(/\/content\/advocates-counsellors$/);
});

test("the Dashboard's published-professionals stat card links to the Advocates & Counsellors module", async ({ page }) => {
  await page.goto("/dashboard");
  const card = page.getByRole("main").getByRole("link", { name: /published advocates & counsellors/i });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/content\/advocates-counsellors$/);
});
