import fs from "node:fs";

import { expect, test } from "@playwright/test";

test("Published Content Bundle includes only published taxonomy and strips admin-only fields", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByText("Published Content Bundle (default)")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /export content bundle/i }).click();
  const download = await downloadPromise;

  const filePath = await download.path();
  const contents = JSON.parse(fs.readFileSync(filePath!, "utf-8"));

  const incidentTypeNames: string[] = contents.data.incidentTypes.map((r: { name: string }) => r.name);
  expect(incidentTypeNames).toContain("Online harassment");
  expect(incidentTypeNames).not.toContain("Domestic and family violence"); // draft
  expect(incidentTypeNames).not.toContain("Online abuse"); // ready_for_review
  expect(incidentTypeNames).not.toContain("Housing crisis"); // needs_update
  expect(incidentTypeNames).not.toContain("Physical assault (legacy)"); // archived

  const triageLabelNames: string[] = contents.data.triageLabels.map((r: { name: string }) => r.name);
  expect(triageLabelNames).toContain("Urgent safety risk");
  expect(triageLabelNames).not.toContain("Information only"); // draft
  expect(triageLabelNames).not.toContain("Legacy high priority (superseded)"); // archived

  const categoryNames: string[] = contents.data.resourceCategories.map((r: { name: string }) => r.name);
  expect(categoryNames).toContain("Legal rights");
  expect(categoryNames).not.toContain("Reporting pathways"); // draft
  expect(categoryNames).not.toContain("Workplace (legacy)"); // archived

  const serializedTaxonomy = JSON.stringify([contents.data.incidentTypes, contents.data.triageLabels, contents.data.resourceCategories]);
  expect(serializedTaxonomy).not.toMatch(/internalNotes/);
  expect(serializedTaxonomy).not.toMatch(/adminGuidance/);

  const onlineHarassment = contents.data.incidentTypes.find((r: { name: string }) => r.name === "Online harassment");
  expect(onlineHarassment.machineKey).toBe("online_harassment");
  expect(onlineHarassment.displayOrder).toBe(0);
  expect(onlineHarassment.status).toBe("published");
});

test("Admin Backup includes every taxonomy status", async ({ page }) => {
  await page.goto("/settings");
  await page.getByLabel(/Admin Backup/).check();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /export content bundle/i }).click();
  const download = await downloadPromise;

  const filePath = await download.path();
  const contents = JSON.parse(fs.readFileSync(filePath!, "utf-8"));

  const incidentTypeNames: string[] = contents.data.incidentTypes.map((r: { name: string }) => r.name);
  expect(incidentTypeNames).toContain("Domestic and family violence"); // draft
  expect(incidentTypeNames).toContain("Physical assault (legacy)"); // archived
});
