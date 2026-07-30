import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/taxonomy/resource-categories");
  await expect(page.getByRole("heading", { level: 1, name: "Resource Categories" })).toBeVisible();
});

test("seeded resource categories load into the management table", async ({ page }) => {
  const table = page.getByRole("table", { name: "Resource categories" });
  await expect(table).toBeVisible();
  await expect(table.getByText("Legal rights")).toBeVisible();
  await expect(table.getByText("Emotional support")).toBeVisible();
});

test("search narrows the resource category list", async ({ page }) => {
  await page.getByPlaceholder("Search resource categories...").fill("Housing");
  await expect(page.getByText("Housing", { exact: true })).toBeVisible();
  await expect(page.getByText("Legal rights")).toHaveCount(0);
});

test("Add resource category navigates to the create form", async ({ page }) => {
  await page.getByRole("link", { name: "Add resource category" }).click();
  await expect(page).toHaveURL(/\/taxonomy\/resource-categories\/new$/);
  await expect(page.getByRole("heading", { level: 1, name: "Add resource category" })).toBeVisible();
});

test("the create form only offers icons from the curated library, never a free-text field", async ({ page }) => {
  await page.goto("/taxonomy/resource-categories/new");
  await expect(page.getByText(/existing icon library only/i)).toBeVisible();
  await expect(page.getByRole("radio", { name: "Safety" })).toBeVisible();
  await expect(page.locator('input[type="url"]')).toHaveCount(0);
});

test("picking an icon shows a live preview using the entered name", async ({ page }) => {
  await page.goto("/taxonomy/resource-categories/new");
  await page.getByLabel("Name shown to administrators and users").fill("Emergency Housing");
  await page.getByRole("radio", { name: "Housing" }).check();
  await expect(page.getByText("Preview:")).toBeVisible();
  await expect(page.getByText("Emergency Housing", { exact: true }).last()).toBeVisible();
});

test("a full create-then-publish flow succeeds for a resource category", async ({ page }) => {
  await page.goto("/taxonomy/resource-categories/new");
  await page.getByLabel("Name shown to administrators and users").fill("Community Support Groups");
  await page.getByLabel("Short description").fill("Peer and community support group listings.");
  await page.getByRole("radio", { name: "General" }).check();
  await page.getByRole("button", { name: "Publish" }).click();

  await expect(page).toHaveURL(/\/taxonomy\/resource-categories\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Community Support Groups" })).toBeVisible();
  await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();
});

test("editing an existing resource category locks the machine key field", async ({ page }) => {
  await page.goto("/taxonomy/resource-categories/demo-category-legal-rights/edit");
  await expect(page.getByLabel("Stable key")).toHaveAttribute("readonly", "");
});

test("the detail page shows the chosen icon and accent colour", async ({ page }) => {
  await page.goto("/taxonomy/resource-categories/demo-category-legal-rights");
  await expect(page.getByText("Legal", { exact: true })).toBeVisible();
  await expect(page.getByText("Brand blue")).toBeVisible();
});

test("an invalid resource category id shows a safe not-found state", async ({ page }) => {
  await page.goto("/taxonomy/resource-categories/this-id-does-not-exist");
  await expect(page.getByText("Resource category not found")).toBeVisible();
});
