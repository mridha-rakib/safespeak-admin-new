import { expect, test } from "@playwright/test";

test("editing a draft persists changes and does not create a second document", async ({ page }) => {
  await page.goto("/content/knowledge-legislation/demo-doc-community-reporting-guidelines/edit");
  await expect(page.getByLabel("Title or legislation name")).toHaveValue(/Draft Community Reporting Guidelines/);

  await page.getByLabel("Title or legislation name").fill("Draft Community Reporting Guidelines — Edited");
  await page.getByRole("button", { name: "Continue" }).click(); // to step 3
  await page.getByRole("button", { name: "Continue" }).click(); // to step 4
  await page.getByRole("button", { name: "Continue" }).click(); // to step 5
  await page.getByRole("button", { name: "Save as draft" }).click();

  await expect(page).toHaveURL(/\/content\/knowledge-legislation\/demo-doc-community-reporting-guidelines$/);
  await expect(page.getByRole("heading", { level: 1, name: "Draft Community Reporting Guidelines — Edited" })).toBeVisible();

  await page.goto("/content/knowledge-legislation");
  await page.getByPlaceholder("Search documents...").fill("Draft Community Reporting Guidelines");
  await expect(page.locator("table tbody tr")).toHaveCount(1);
});

test("legal review, ready-for-review, and publish move a document through the full workflow", async ({ page }) => {
  // Seeded "Workplace Harassment Policy Template" is ready_for_review with extraction already
  // succeeded but legal review incomplete — exercises the exact narrow publish blocker.
  await page.goto("/content/knowledge-legislation/demo-doc-workplace-harassment-policy");
  await expect(page.getByText("Needs legal review")).toBeVisible();

  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Legal review complete").check();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText(/Publish is not available yet/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Publish" }).click();

  await expect(page).toHaveURL(/\/content\/knowledge-legislation\/demo-doc-workplace-harassment-policy$/);
  await expect(page.getByText("Published", { exact: true })).toBeVisible();
  await expect(page.getByText("Legal review complete")).toBeVisible();

  // Audit activity reflects both the metadata update and the publish transition.
  await expect(page.getByRole("table", { name: /Audit activity/ })).toBeVisible();
  await expect(page.getByText(/published/i).first()).toBeVisible();
});

test("publish stays blocked and explains why when legal review is left incomplete", async ({ page }) => {
  await page.goto("/content/knowledge-legislation/demo-doc-workplace-harassment-policy/edit");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();
  await expect(page.getByText(/legal review is not marked complete/i)).toBeVisible();
});
