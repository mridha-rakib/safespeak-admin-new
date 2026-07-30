import path from "node:path";

import { expect, test } from "@playwright/test";

// Playwright compiles spec files to CommonJS, where __dirname is already a
// native global — no import.meta/fileURLToPath ESM shim needed (and using
// one here breaks loading under a CJS runtime).
const SAMPLE_PDF = path.join(__dirname, "fixtures", "sample.pdf");

test("full create workflow: upload, fill every step, save as draft, and persist across reload", async ({ page }) => {
  await page.goto("/content/knowledge-legislation");
  const initialRowCount = await page.locator("table tbody tr").count();

  await page.getByRole("link", { name: "Add document" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Add document" })).toBeVisible();

  // Step 1 — upload
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(SAMPLE_PDF);
  await expect(page.getByText(/extracting text locally/i)).toBeVisible();
  await expect(page.getByText(/local preview ready/i)).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 2 — source information
  await page.getByLabel("Title or legislation name").fill("E2E Test Demo Guidance");
  await page.getByLabel("Source category").fill("Test category");
  await page.getByLabel("Authority or publisher").fill("E2E Test Authority");
  await page.getByLabel("Jurisdiction").selectOption("nsw");
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 3 — legal scope
  await page.getByLabel("Next review date").fill("2027-01-01");
  const sectionInput = page.getByPlaceholder("e.g. Section 18C");
  await sectionInput.fill("Section 1");
  await sectionInput.press("Enter");
  await expect(page.getByText("Section 1", { exact: true })).toBeVisible();
  // duplicate is rejected with a warning, not silently added twice
  await sectionInput.fill("Section 1");
  await sectionInput.press("Enter");
  await expect(page.getByText("That entry is already in the list.")).toBeVisible();
  await expect(page.getByText("Section 1", { exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 4 — AI & governance: leave legal review unchecked
  await page.getByLabel("AI use allowed").check();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 5 — review & save
  await expect(page.getByText("Needs legal review")).toBeVisible();
  await expect(page.getByText(/Publish is not available yet/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();

  await page.getByRole("button", { name: "Save as draft" }).click();
  await expect(page).toHaveURL(/\/content\/knowledge-legislation\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "E2E Test Demo Guidance" })).toBeVisible();

  await page.goto("/content/knowledge-legislation");
  const rowCountAfter = await page.locator("table tbody tr").count();
  // Exactly one new row appeared — no duplicate document was created.
  const search = page.getByPlaceholder("Search documents...");
  await search.fill("E2E Test Demo Guidance");
  await expect(page.locator("table tbody tr")).toHaveCount(1);
  expect(rowCountAfter).toBeGreaterThan(initialRowCount);

  // Reload and confirm the draft is still there (persisted, not just in-memory).
  await page.reload();
  await expect(page.locator("table tbody tr")).toHaveCount(1);
});

test("cancelling with unsaved changes asks for confirmation", async ({ page }) => {
  await page.goto("/content/knowledge-legislation/new");
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_PDF);
  await expect(page.getByText(/local preview ready/i)).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Title or legislation name").fill("Something I will not save");

  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog", { name: "Discard unsaved changes?" })).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Title or legislation name")).toHaveValue("Something I will not save");
});
