import { expect, test } from "@playwright/test";

test("a referenced resource category shows its usage count and offers Replace references instead of delete", async ({ page }) => {
  await page.goto("/taxonomy/resource-categories/demo-category-legal-rights");
  await expect(page.getByText("Used by 2 record(s)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Replace references" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete draft" })).toHaveCount(0);

  await expect(page.getByText("Where this is used")).toBeVisible();
  await expect(page.getByText("Online harassment")).toBeVisible();
  await expect(page.getByText("Workplace discrimination")).toBeVisible();
});

test("Replace references repoints every referencing record and can archive the source", async ({ page }) => {
  await page.goto("/taxonomy/resource-categories/demo-category-legal-rights");
  await page.getByRole("button", { name: "Replace references" }).click();

  const dialog = page.getByRole("dialog", { name: /Replace references/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("2 records currently reference this item.")).toBeVisible();

  await dialog.getByLabel("Replacement").selectOption({ label: "Safety" });
  await dialog.getByRole("button", { name: "Confirm replacement" }).click();

  await expect(dialog.getByText(/2 records now reference the/i)).toBeVisible();
  // Two "Close" buttons exist here: the footer button and the dialog's corner
  // icon button (aria-label="Close") — the footer one renders first in DOM order.
  await dialog.getByRole("button", { name: "Close" }).first().click();

  // The source was archived once the replacement finished (Archive checkbox defaults to checked).
  await expect(page.getByText("Archived", { exact: true }).first()).toBeVisible();

  // Every previously-referencing incident type now points at the replacement instead.
  await page.goto("/taxonomy/incident-types/demo-incident-online-harassment");
  await expect(page.getByRole("heading", { level: 1, name: "Online harassment" })).toBeVisible();
  // Scoped to the containing <p>, not getByText(/Related resource categories:/)
  // directly — that regex also (and more specifically) matches the label
  // <span> alone, whose own text never includes the sibling category name.
  const relatedParagraph = page.locator("p", { hasText: "Related resource categories:" });
  await expect(relatedParagraph).toContainText("Safety");
  await expect(relatedParagraph).not.toContainText("Legal rights");
});

test("an unreferenced draft incident type can be permanently deleted, a referenced/published one cannot", async ({ page }) => {
  await page.goto("/taxonomy/incident-types/demo-incident-domestic-violence");
  await expect(page.getByRole("heading", { level: 1, name: "Domestic and family violence" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete draft" })).toBeVisible();

  await page.getByRole("button", { name: "Delete draft" }).click();
  await page.getByRole("dialog", { name: "Delete this draft?" }).getByRole("button", { name: "Delete draft" }).click();
  await expect(page).toHaveURL(/\/taxonomy\/incident-types$/);

  await page.goto("/taxonomy/incident-types/demo-incident-online-harassment");
  await expect(page.getByRole("button", { name: "Delete draft" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Archive" })).toBeVisible();
});

test("reorder mode moves a record and persists the new display order after Save order", async ({ page }) => {
  await page.goto("/taxonomy/incident-types");
  await page.getByRole("button", { name: "Reorder" }).click();

  // Scoped to the OL that actually contains Move up/down buttons — a plain
  // "ol li" selector also matches the page's breadcrumb list.
  const list = page.locator("ol").filter({ has: page.getByRole("button", { name: /^Move/ }) }).locator("li");
  await expect(list.first()).toContainText("Online harassment");

  await page.getByRole("button", { name: "Move Online harassment down" }).click();
  await expect(page.getByRole("status")).toContainText("Online harassment moved to position 2");

  await page.getByRole("button", { name: "Save order" }).click();
  await expect(page.getByRole("status")).toContainText("Display order saved.");

  await page.getByRole("button", { name: "Done reordering" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Reorder" }).click();
  await expect(list.first()).toContainText("Workplace discrimination");
});
