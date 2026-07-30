import path from "node:path";

import { expect, test } from "@playwright/test";

// Playwright compiles spec files to CommonJS, where __dirname is already a
// native global — no import.meta/fileURLToPath ESM shim needed (and using
// one here breaks loading under a CJS runtime).
const SAMPLE_PDF = path.join(__dirname, "fixtures", "sample.pdf");

test("processing issues tab lists the seeded failed document with plain-language reason", async ({ page }) => {
  await page.goto("/content/knowledge-legislation");
  await page.getByRole("tab", { name: "Processing issues" }).click();
  await expect(page.getByText(/community reporting guidelines/i)).toBeVisible();
  await expect(page.getByText(/password-protected or corrupted/i)).toBeVisible();
});

test("retrying extraction on a failed document does not create a duplicate document", async ({ page }) => {
  await page.goto("/content/knowledge-legislation");
  const beforeCount = await page.locator("table tbody tr").count();

  await page.getByRole("tab", { name: "Processing issues" }).click();
  await page.getByRole("button", { name: "Retry extraction" }).click();
  // This demo document was seeded with file metadata only (no real stored blob, since seed data
  // isn't a real upload), so the retry reports "no local file stored" — what matters here is that
  // no new document row is created either way.
  await expect(page.getByText(/retry (succeeded|failed)/i)).toBeVisible({ timeout: 20_000 });

  await page.goto("/content/knowledge-legislation");
  const afterCount = await page.locator("table tbody tr").count();
  expect(afterCount).toBe(beforeCount);
});

test("replacing a file requires confirmation and explains what will change", async ({ page }) => {
  await page.goto("/content/knowledge-legislation/demo-doc-discrimination-act-guide/edit");
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_PDF);

  const dialog = page.getByRole("dialog", { name: "Replace the current PDF?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/local text preview and local chunks/i)).toBeVisible();

  await dialog.getByRole("button", { name: "Replace file" }).click();
  await expect(page.getByText(/file was replaced/i)).toBeVisible({ timeout: 20_000 });
});

test("cancelling a file replacement leaves the original file untouched", async ({ page }) => {
  await page.goto("/content/knowledge-legislation/demo-doc-discrimination-act-guide/edit");
  await expect(page.getByText("racial-discrimination-act-summary-demo.pdf")).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(SAMPLE_PDF);
  const dialog = page.getByRole("dialog", { name: "Replace the current PDF?" });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByText("racial-discrimination-act-summary-demo.pdf")).toBeVisible();
});
