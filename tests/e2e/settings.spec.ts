import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
});

test("discloses local-only storage and no-backend status", async ({ page }) => {
  await expect(page.getByText("This data is stored in this browser only")).toBeVisible();
  await expect(page.getByText("No backend is connected")).toBeVisible();
});

test("local data status card reports schema versions from the repository", async ({ page }) => {
  await expect(page.getByText("Database schema version")).toBeVisible();
  await expect(page.getByText("Bundle schema version")).toBeVisible();
  await expect(page.getByText("Seeded", { exact: false })).toBeVisible();
});

test("reset demo data requires confirmation and can be cancelled without changes", async ({ page }) => {
  await page.getByRole("button", { name: "Reset demo data" }).click();

  const dialog = page.getByRole("dialog", { name: "Reset local demo data?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/replaces every record marked as demo data/i)).toBeVisible();

  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
});

test("confirming reset demo data succeeds and records an audit event", async ({ page }) => {
  await page.getByRole("button", { name: "Reset demo data" }).click();
  const dialog = page.getByRole("dialog", { name: "Reset local demo data?" });

  await dialog.getByRole("button", { name: "Reset demo data" }).click();
  await expect(dialog.getByText("Demo data reset")).toBeVisible();
  // Two "Close" buttons exist here: the footer button and the dialog's
  // corner icon button (aria-label="Close") — the footer one renders first
  // in DOM order (see DialogContent: children, then the optional X button).
  await dialog.getByRole("button", { name: "Close" }).first().click();

  await page.goto("/publishing/audit-history");
  await expect(page.getByText("Demo data reset").first()).toBeVisible();
});

test("exporting the default Published Content Bundle as JSON triggers a download and logs the export", async ({ page }) => {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /export content bundle/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^safespeak-published-content-bundle-.*\.json$/);
  await expect(page.getByText("Bundle exported")).toBeVisible();
});

test("exporting states it does not automatically update safespeak-frontend", async ({ page }) => {
  await expect(page.getByText(/does not update safespeak-frontend automatically/i)).toBeVisible();
});
