import { expect, test } from "@playwright/test";

test("delete is available for a local draft and requires confirmation", async ({ page }) => {
  await page.goto("/content/knowledge-legislation/demo-doc-community-reporting-guidelines");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await expect(page.getByRole("button", { name: "Delete draft" })).toBeVisible();
  await page.getByRole("button", { name: "Delete draft" }).click();

  const dialog = page.getByRole("dialog", { name: "Delete this draft?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/local pdf, and its local chunk previews/i)).toBeVisible();

  await dialog.getByRole("button", { name: "Delete draft" }).click();
  await expect(page).toHaveURL(/\/content\/knowledge-legislation$/);

  await page.getByPlaceholder("Search documents...").fill("Draft Community Reporting Guidelines");
  await expect(page.locator("table tbody tr")).toHaveCount(0);
});

test("cancelling delete keeps the draft", async ({ page }) => {
  await page.goto("/content/knowledge-legislation/demo-doc-community-reporting-guidelines");
  await page.getByRole("button", { name: "Delete draft" }).click();
  await page.getByRole("dialog", { name: "Delete this draft?" }).getByRole("button", { name: "Cancel" }).click();

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("a published document offers Archive but never a permanent delete action", async ({ page }) => {
  await page.goto("/content/knowledge-legislation/demo-doc-discrimination-act-guide");
  await expect(page.getByRole("button", { name: "Archive" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete draft" })).toHaveCount(0);
});

test("archiving a published document updates its status and offers a restore-to-draft path", async ({ page }) => {
  await page.goto("/content/knowledge-legislation/demo-doc-discrimination-act-guide");
  await page.getByRole("button", { name: "Archive" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByText("Archived", { exact: true }).first()).toBeVisible();

  // Restoring is the documented recovery path — archived content can move back to draft.
  await expect(page.getByRole("button", { name: "Move back to draft" })).toBeVisible();
});
