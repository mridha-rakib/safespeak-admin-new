import { expect, test } from "@playwright/test";

/**
 * Critical smoke coverage for the Rights & Legal Information module — the
 * golden path plus the legal-source/disclaimer rule that is specific to this
 * module, not a full historical regression suite. See
 * docs/ARCHITECTURE.md "Phase 4 testing scope."
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/content/rights-legal-information");
  await expect(page.getByRole("heading", { level: 1, name: "Rights & Legal Information" })).toBeVisible();
});

test("seeded records load into the management table", async ({ page }) => {
  const table = page.getByRole("table", { name: "Rights & Legal Information" });
  await expect(table).toBeVisible();
  await expect(table.getByText("Your right to report anonymously")).toBeVisible();
  await expect(table.getByText("Understanding reasonable adjustments")).toBeVisible();
});

test("Add record navigates to the create form and shows a live user-facing preview", async ({ page }) => {
  await page.getByRole("link", { name: "Add record" }).click();
  await expect(page).toHaveURL(/\/content\/rights-legal-information\/new$/);
  await expect(page.getByText("User-facing preview")).toBeVisible();

  await page.getByLabel("Title").fill("Preview title check");
  await expect(page.getByText("Preview title check")).toBeVisible();
});

test("a legal-claim content type requires a governed legislation source and a disclaimer before publish", async ({ page }) => {
  await page.goto("/content/rights-legal-information/new");
  await page.getByLabel("Title").fill("Smoke test legal record");
  await page.getByLabel("Short summary").fill("A short summary for the smoke test record.");
  await page.getByLabel("Full content").fill("Full body content for the smoke test record.");
  await page.getByLabel("Content type").selectOption({ label: "Discrimination rights" });
  await expect(page.getByText(/needs a governed legislation source and a public disclaimer/i)).toBeVisible();

  await page.getByLabel("Jurisdiction").selectOption({ label: "New South Wales" });
  await page.getByLabel("Review due date").fill("2027-01-01");
  await page.getByRole("checkbox", { name: "Legal rights" }).check();
  await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();

  await page.getByRole("checkbox", { name: /Racial Discrimination Act/ }).check();
  await page.getByLabel(/Public disclaimer/).fill("This is general information only, not personalised legal advice.");
  await expect(page.getByRole("button", { name: "Publish" })).toBeEnabled();
});

test("an informational content type does not require a legislation source", async ({ page }) => {
  await page.goto("/content/rights-legal-information/new");
  await page.getByLabel("Title").fill("Smoke test informational record");
  await page.getByLabel("Short summary").fill("A short summary for the smoke test record.");
  await page.getByLabel("Full content").fill("Full body content for the smoke test record.");
  await page.getByLabel("Content type").selectOption({ label: "Evidence information" });
  await expect(page.getByText(/needs a governed legislation source/i)).toHaveCount(0);

  await page.getByLabel("Jurisdiction").selectOption({ label: "Victoria" });
  await page.getByLabel("Review due date").fill("2027-01-01");
  await page.getByRole("checkbox", { name: "Legal rights" }).check();
  await expect(page.getByRole("button", { name: "Publish" })).toBeEnabled();
});

test("editing an existing record preloads its saved values", async ({ page }) => {
  await page.goto("/content/rights-legal-information/demo-rights-report-anonymously/edit");
  await expect(page.getByLabel("Title")).toHaveValue("Your right to report anonymously");
});

test("the published record's disclaimer is shown in the user-facing preview on its detail page", async ({ page }) => {
  await page.goto("/content/rights-legal-information/demo-rights-report-anonymously");
  await expect(page.getByText("This information is general and educational only")).toBeVisible();
});

test("a referenced draft record cannot be hard-deleted", async ({ page }) => {
  await page.goto("/content/rights-legal-information/demo-rights-reasonable-adjustments");
  await expect(page.getByRole("heading", { level: 1, name: "Understanding reasonable adjustments" })).toBeVisible();
  await page.getByRole("button", { name: "Delete draft" }).click();
  await page.getByRole("dialog", { name: "Delete this draft?" }).getByRole("button", { name: "Delete draft" }).click();
  await expect(page.getByText(/used by \d+ other record/i)).toBeVisible();
  await expect(page).toHaveURL(/\/content\/rights-legal-information\/demo-rights-reasonable-adjustments$/);
});

test("the Review Queue surfaces a rights content record's blocking issues and links back to it", async ({ page }) => {
  await page.goto("/publishing/review-queue");
  const row = page.getByRole("row", { name: /Evidence and documentation basics/ });
  await expect(row).toBeVisible();
  await expect(row.getByText(/resource category is required/i)).toBeVisible();
  await expect(row.getByRole("link", { name: "View" })).toHaveAttribute(
    "href",
    "/content/rights-legal-information/demo-rights-evidence-and-documentation-basics"
  );
});

test("the Dashboard's published-rights-content stat card links to the Rights & Legal Information module", async ({ page }) => {
  await page.goto("/dashboard");
  const card = page.getByRole("main").getByRole("link", { name: /published rights content/i });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/content\/rights-legal-information$/);
});
