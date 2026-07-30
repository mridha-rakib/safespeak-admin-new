import path from "node:path";

import { expect, test } from "@playwright/test";

// Playwright compiles spec files to CommonJS, where __dirname is already a
// native global — no import.meta/fileURLToPath ESM shim needed (and using
// one here breaks loading under a CJS runtime).
const SAMPLE_PDF = path.join(__dirname, "fixtures", "sample.pdf");

/**
 * Covers the Phase 1 local-PDF-preview proof, relocated to the Phase 2
 * create-document wizard (Step 1) — the old tab-based "Upload document"
 * panel was superseded by /content/knowledge-legislation/new.
 */
test.beforeEach(async ({ page }) => {
  await page.goto("/content/knowledge-legislation/new");
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
});
