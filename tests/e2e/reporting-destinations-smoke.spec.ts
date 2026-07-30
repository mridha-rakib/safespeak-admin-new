import { expect, test } from "@playwright/test";

/**
 * Critical smoke coverage for the Reporting Destinations module — the
 * golden path plus the reporting-method/contact-data consistency rule and
 * the anonymous-reporting tri-state, not a full historical regression
 * suite. See docs/ARCHITECTURE.md "Phase 5 testing scope."
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/content/reporting-destinations");
  await expect(page.getByRole("heading", { level: 1, name: "Reporting Destinations" })).toBeVisible();
});

test("seeded reporting destinations load into the management table", async ({ page }) => {
  const table = page.getByRole("table", { name: "Reporting destinations" });
  await expect(table).toBeVisible();
  await expect(table.getByText("Local Police Non-Emergency Line (Demo)")).toBeVisible();
  await expect(table.getByText("State Legal Aid Commission (Demo)")).toBeVisible();
});

test("Add Reporting Destination navigates to the create form and shows a live user-facing preview", async ({ page }) => {
  await page.getByRole("link", { name: "Add Reporting Destination" }).click();
  await expect(page).toHaveURL(/\/content\/reporting-destinations\/new$/);
  await expect(page.getByText("User-facing preview")).toBeVisible();

  await page.getByLabel("Destination name").fill("Preview name check");
  await expect(page.getByText("Preview name check")).toBeVisible();
});

test("selecting a reporting method without its backing contact data blocks Ready for review / Publish", async ({ page }) => {
  await page.goto("/content/reporting-destinations/new");
  await page.getByLabel("Destination name").fill("Smoke test destination");
  await page.getByLabel("Short description").fill("Short description.");
  await page.getByLabel("Destination type").selectOption({ label: "Police" });
  await page.getByRole("checkbox", { name: "New South Wales" }).check();
  await page.getByLabel("Instructions").fill("Call this number to make a report.");
  await page.getByLabel("Review due date").fill("2027-01-01");

  await page.getByRole("checkbox", { name: "Online form" }).check();
  await expect(page.getByText(/Missing contact information for: Online form/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();

  await page.getByRole("checkbox", { name: "Online form" }).uncheck();
  await page.getByRole("checkbox", { name: "Phone" }).check();
  await page.getByRole("textbox", { name: "Phone" }).fill("0000 000 000");

  await expect(page.getByRole("button", { name: "Publish" })).toBeEnabled();
  await page.getByRole("button", { name: "Publish" }).click();

  await expect(page).toHaveURL(/\/content\/reporting-destinations\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Smoke test destination" })).toBeVisible();
});

test("anonymous reporting 'Unknown' is the default and remains visible rather than reading as No", async ({ page }) => {
  await page.goto("/content/reporting-destinations/demo-destination-workplace-ombudsperson");
  await expect(page.getByText("Anonymous reporting: Unknown / not confirmed").first()).toBeVisible();
});

test("a non-emergency destination is never presented as an emergency service", async ({ page }) => {
  await page.goto("/content/reporting-destinations/demo-destination-local-police-non-emergency");
  await expect(page.getByText("Emergency suitable")).toHaveCount(0);
});

test("editing an existing destination preloads its saved values", async ({ page }) => {
  await page.goto("/content/reporting-destinations/demo-destination-local-police-non-emergency/edit");
  await expect(page.getByLabel("Destination name")).toHaveValue("Local Police Non-Emergency Line (Demo)");
});

test("a referenced draft destination cannot be hard-deleted; an unreferenced eligible draft can", async ({ page }) => {
  await page.goto("/content/reporting-destinations/demo-destination-workplace-ombudsperson");
  await expect(page.getByRole("heading", { level: 1, name: "Workplace Ombudsperson Office (Demo)" })).toBeVisible();
  await page.getByRole("button", { name: "Delete draft" }).click();
  await page.getByRole("dialog", { name: "Delete this draft?" }).getByRole("button", { name: "Delete draft" }).click();
  await expect(page.getByText(/used by \d+ other record/i)).toBeVisible();
  await expect(page).toHaveURL(/\/content\/reporting-destinations\/demo-destination-workplace-ombudsperson$/);

  await page.goto("/content/reporting-destinations/demo-destination-fully-eligible-draft");
  await page.getByRole("button", { name: "Delete draft" }).click();
  await page.getByRole("dialog", { name: "Delete this draft?" }).getByRole("button", { name: "Delete draft" }).click();
  await expect(page).toHaveURL(/\/content\/reporting-destinations$/);
});

test("the Dashboard's published-destinations stat card links to the Reporting Destinations module", async ({ page }) => {
  await page.goto("/dashboard");
  const card = page.getByRole("main").getByRole("link", { name: /published reporting destinations/i });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/content\/reporting-destinations$/);
});
