import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/content/knowledge-legislation");
  await expect(page.getByRole("tab", { name: "Documents" })).toBeVisible();
});

test("seeded documents load into the management table", async ({ page }) => {
  const table = page.getByRole("table", { name: "Knowledge and legislation documents" });
  await expect(table).toBeVisible();
  await expect(table.getByText("Racial Discrimination Act")).toBeVisible();
});

test("search narrows the document list", async ({ page }) => {
  const search = page.getByPlaceholder("Search documents...");
  await search.fill("Consumer Protection");
  await expect(page.getByText("Consumer Protection Notice Summary")).toBeVisible();
  await expect(page.getByText("Racial Discrimination Act")).toHaveCount(0);
});

test("filtering by status narrows the list to matching documents only", async ({ page }) => {
  await page.locator("#filter-status").selectOption("archived");
  await expect(page.getByText("Superseded Reporting Circular")).toBeVisible();
  await expect(page.getByText("Racial Discrimination Act")).toHaveCount(0);
});

test("filtering by jurisdiction narrows the list", async ({ page }) => {
  await page.locator("#filter-jurisdiction").selectOption("wa");
  await expect(page.getByText("Consumer Protection Notice Summary")).toBeVisible();
  await expect(page.getByText("Racial Discrimination Act")).toHaveCount(0);
});

test("filtering by processing status narrows the list", async ({ page }) => {
  await page.locator("#filter-processing").selectOption("processing_issue");
  await expect(page.getByText("Draft Community Reporting Guidelines")).toBeVisible();
  await expect(page.getByText("Racial Discrimination Act")).toHaveCount(0);
});

test("clear filters restores the full list", async ({ page }) => {
  await page.locator("#filter-status").selectOption("archived");
  await expect(page.getByRole("button", { name: "Clear filters" })).toBeEnabled();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByText("Racial Discrimination Act")).toBeVisible();
});

test("no documents matching filters shows a distinct message from a truly empty list", async ({ page }) => {
  await page.locator("#filter-status").selectOption("archived");
  await page.locator("#filter-jurisdiction").selectOption("nsw");
  await expect(page.getByText("No documents match the current filters")).toBeVisible();
});

test("Add document navigates to the create wizard", async ({ page }) => {
  await page.getByRole("link", { name: "Add document" }).click();
  await expect(page).toHaveURL(/\/content\/knowledge-legislation\/new$/);
  await expect(page.getByRole("heading", { level: 1, name: "Add document" })).toBeVisible();
});

test("an invalid document id shows a safe not-found state instead of crashing", async ({ page }) => {
  await page.goto("/content/knowledge-legislation/this-id-does-not-exist");
  await expect(page.getByText("Document not found")).toBeVisible();
  await page.getByRole("link", { name: "Back to Knowledge & Legislation" }).click();
  await expect(page).toHaveURL(/\/content\/knowledge-legislation$/);
});

test("browser back, forward, and refresh all work from the document list", async ({ page }) => {
  await page.getByRole("link", { name: "Racial Discrimination Act", exact: false }).first().click();
  await expect(page).toHaveURL(/\/content\/knowledge-legislation\/demo-doc-discrimination-act-guide$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/content\/knowledge-legislation$/);

  await page.goForward();
  await expect(page).toHaveURL(/\/content\/knowledge-legislation\/demo-doc-discrimination-act-guide$/);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: /Racial Discrimination Act/ })).toBeVisible();
});
