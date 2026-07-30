import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/content/knowledge-legislation/demo-doc-discrimination-act-guide");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("source, dates, and legal-scope metadata render", async ({ page }) => {
  await expect(page.getByText("Federal legislation")).toBeVisible();
  await expect(page.getByText("Demo Legal Reference Library")).toBeVisible();
  await expect(page.getByText("Commonwealth / Australia")).toBeVisible();
  await expect(page.getByText("Part II — Prohibition of racial discrimination")).toBeVisible();
});

test("source file information renders with a download action", async ({ page }) => {
  await expect(page.getByText("racial-discrimination-act-summary-demo.pdf")).toBeVisible();
  await expect(page.getByRole("button", { name: "Download local PDF" })).toBeVisible();
});

test("local text preview renders", async ({ page }) => {
  await expect(page.getByText(/stands in for the opening section/i)).toBeVisible();
});

test("local chunk preview renders and can be searched", async ({ page }) => {
  await expect(page.getByText(/Chunk 1/)).toBeVisible();
  const search = page.getByPlaceholder("Search within local chunks...");
  await search.fill("offensive behaviour");
  await expect(page.getByText(/Section 18C/)).toBeVisible();
  await expect(page.getByText(/Chunk 1/)).toHaveCount(0);
});

test("the RAG readiness checklist is accurate for a fully-eligible document", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "RAG readiness checklist" })).toBeVisible();
  await expect(page.getByText("Local file available")).toBeVisible();
  await expect(page.getByText("Local chunks generated")).toBeVisible();
  await expect(page.getByText(/not indexed in a production RAG system/i)).toBeVisible();
});

test("an overdue document shows the overdue indicator", async ({ page }) => {
  await page.goto("/content/knowledge-legislation/demo-doc-consumer-notice-overdue");
  await expect(page.getByText("Overdue for review")).toBeVisible();
});

test("audit activity table renders for the document", async ({ page }) => {
  await expect(page.getByRole("table", { name: /Audit activity/ })).toBeVisible();
});
