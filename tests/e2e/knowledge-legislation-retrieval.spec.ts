import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/content/knowledge-legislation");
  await page.getByRole("tab", { name: "Test retrieval" }).click();
});

test("states this is a local keyword preview, not production semantic retrieval", async ({ page }) => {
  await expect(page.getByText(/local keyword retrieval preview/i)).toBeVisible();
  await expect(page.getByText(/no embeddings are generated/i)).toBeVisible();
  await expect(page.getByText(/no server or vector database is used/i)).toBeVisible();
});

test("a matching query returns the document, page range, and matched terms", async ({ page }) => {
  await page.getByPlaceholder(/racial discrimination in the workplace/i).fill("racial discrimination");
  await page.getByRole("button", { name: "Search local chunks" }).click();

  await expect(page.getByText("Racial Discrimination Act").first()).toBeVisible();
  await expect(page.getByText(/Pages \d/).first()).toBeVisible();
  await expect(page.getByText(/Matched terms:/).first()).toBeVisible();
});

test("an unmatched query shows a useful empty state instead of inventing an answer", async ({ page }) => {
  await page.getByPlaceholder(/racial discrimination in the workplace/i).fill("zzz-no-such-topic-zzz");
  await page.getByRole("button", { name: "Search local chunks" }).click();

  await expect(page.getByText("No local chunks matched")).toBeVisible();
});

test("admin testing scope can surface a non-published source with an explicit inclusion reason", async ({ page }) => {
  await page.getByPlaceholder(/racial discrimination in the workplace/i).fill("workplace harassment complaint");
  await page.locator("select").nth(2).selectOption("all_processed");
  await page.getByRole("button", { name: "Search local chunks" }).click();

  await expect(page.getByText(/Included for admin testing only/i)).toBeVisible();
});
