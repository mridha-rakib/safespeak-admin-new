import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/publishing/audit-history");
  await expect(page.getByRole("table", { name: "Audit history" })).toBeVisible();
});

test("discloses this is local browser history, not a tamper-proof audit trail", async ({ page }) => {
  await expect(page.getByText(/not a tamper-proof audit trail/i)).toBeVisible();
});

test("search narrows the table and an unmatched query shows the empty state", async ({ page }) => {
  const search = page.getByPlaceholder("Search audit history...");
  const rowCountBefore = await page.locator("table tbody tr").count();
  expect(rowCountBefore).toBeGreaterThan(0);

  await search.fill("zzz-no-such-audit-event-zzz");
  await expect(page.getByText("No audit events yet")).toBeVisible();

  await search.fill("");
  await expect(page.locator("table tbody tr").first()).toBeVisible();
});

test("clicking a sortable column header toggles ascending/descending order", async ({ page }) => {
  const summaryHeader = page.getByRole("columnheader", { name: /summary/i }).getByRole("button");
  await summaryHeader.click();
  await expect(page.getByRole("columnheader", { name: /summary/i })).toHaveAttribute("aria-sort", "ascending");

  await summaryHeader.click();
  await expect(page.getByRole("columnheader", { name: /summary/i })).toHaveAttribute("aria-sort", "descending");
});

test("column sorting is reachable by keyboard", async ({ page }) => {
  const summaryHeader = page.getByRole("columnheader", { name: /summary/i }).getByRole("button");
  await summaryHeader.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("columnheader", { name: /summary/i })).toHaveAttribute("aria-sort", "ascending");
});

test("pagination moves between pages and reports the current page", async ({ page }) => {
  await page.getByLabel("Rows per page").selectOption("10");
  await expect(page.getByText(/Page 1 of/)).toBeVisible();

  const nextButton = page.getByRole("button", { name: "Next page" });
  await expect(nextButton).toBeEnabled();
  await nextButton.click();
  await expect(page.getByText(/Page 2 of/)).toBeVisible();

  await page.getByRole("button", { name: "Previous page" }).click();
  await expect(page.getByText(/Page 1 of/)).toBeVisible();
});

test("page size selector persists across a reload", async ({ page }) => {
  const pageSizeSelect = page.getByLabel("Rows per page");
  await pageSizeSelect.selectOption("20");
  await page.reload();
  await expect(page.getByLabel("Rows per page")).toHaveValue("20");
});
