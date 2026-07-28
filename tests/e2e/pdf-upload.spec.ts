import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_PDF = path.join(__dirname, "fixtures", "sample.pdf");

test.beforeEach(async ({ page }) => {
  await page.goto("/content/knowledge-legislation");
  await page.getByRole("tab", { name: "Upload document" }).click();
});

test("states this is a local preview, not production RAG indexing", async ({ page }) => {
  await expect(page.getByText(/does not create embeddings, does not call a server/i)).toBeVisible();
});

test("rejects a non-PDF file with an accessible error", async ({ page }) => {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("just some text, not a pdf"),
  });

  await expect(page.getByRole("alert")).toContainText(/only pdf files/i);
});

test("a valid PDF is accepted, extracted locally, and produces a chunk preview", async ({ page }) => {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(SAMPLE_PDF);

  await expect(page.getByText(/local preview ready/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/not indexed in a production rag system/i)).toBeVisible();

  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  await expect(page.getByText("sample")).toBeVisible();
  await expect(page.getByText("Ready for AI processing")).toBeVisible();
});

test("processing issues tab lists documents that failed local extraction", async ({ page }) => {
  await page.getByRole("tab", { name: "Processing issues" }).click();
  await expect(page.getByText(/community reporting guidelines/i)).toBeVisible();
  await expect(page.getByText(/password-protected or corrupted/i)).toBeVisible();
});

test("test retrieval tab is explicitly marked not implemented", async ({ page }) => {
  await page.getByRole("tab", { name: "Test retrieval" }).click();
  await expect(page.getByText(/not implemented in this phase/i)).toBeVisible();
  await expect(page.getByPlaceholder(/test retrieval will be available/i)).toBeDisabled();
});
