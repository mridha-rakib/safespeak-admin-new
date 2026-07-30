import fs from "node:fs";

import { expect, test } from "@playwright/test";

test("Published Content Bundle excludes drafts, archived records, and internal notes; AI-disabled legislation is included but marked not AI-eligible", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByText("Published Content Bundle (default)")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /export content bundle/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^safespeak-published-content-bundle-.*\.json$/);

  const filePath = await download.path();
  const contents = JSON.parse(fs.readFileSync(filePath!, "utf-8"));

  expect(contents.manifest.purpose).toBe("published_content");
  expect(contents.manifest.includedStatuses).toEqual(["published"]);

  const titles: string[] = contents.data.legislation.map((d: { title: string }) => d.title);
  expect(titles.some((t) => t.includes("Workplace Harassment Policy Template"))).toBe(false); // ready_for_review, excluded
  expect(titles.some((t) => t.includes("Draft Community Reporting Guidelines"))).toBe(false); // draft, excluded
  expect(titles.some((t) => t.includes("Superseded Reporting Circular"))).toBe(false); // archived, excluded
  expect(titles.some((t) => t.includes("Racial Discrimination Act"))).toBe(true); // published, included

  const aiDisabled = contents.data.legislation.find((d: { title: string }) =>
    d.title.includes("Workplace Health and Safety Guidance")
  );
  expect(aiDisabled).toBeTruthy();
  expect(aiDisabled.aiUsagePermission).toBe(false);
  expect(aiDisabled.aiEligible).toBe(false);

  const serialized = JSON.stringify(contents.data);
  expect(serialized).not.toMatch(/reviewNotes/);
  expect(serialized).not.toMatch(/blob:/);
  expect(serialized).not.toMatch(/[A-Za-z]:\\\\/);
});

test("Admin Backup includes drafts and archived records and is clearly labelled", async ({ page }) => {
  await page.goto("/settings");
  await page.getByLabel(/Admin Backup/).check();
  await expect(page.getByText(/not for user-frontend consumption/i)).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /export content bundle/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^safespeak-admin-backup-bundle-.*\.json$/);

  const filePath = await download.path();
  const contents = JSON.parse(fs.readFileSync(filePath!, "utf-8"));
  expect(contents.manifest.purpose).toBe("admin_backup");

  const titles: string[] = contents.data.legislation.map((d: { title: string }) => d.title);
  expect(titles.some((t: string) => t.includes("Draft Community Reporting Guidelines"))).toBe(true);
  expect(titles.some((t: string) => t.includes("Superseded Reporting Circular"))).toBe(true);
});
