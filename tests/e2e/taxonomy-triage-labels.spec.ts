import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/taxonomy/triage-labels");
  await expect(page.getByRole("heading", { level: 1, name: "Triage Labels" })).toBeVisible();
});

test("seeded triage labels load into the management table with their label group", async ({ page }) => {
  const table = page.getByRole("table", { name: "Triage labels" });
  await expect(table).toBeVisible();
  await expect(table.getByText("Urgent safety risk")).toBeVisible();
  await expect(table.getByText("Bias indicator").first()).toBeVisible();
});

test("search narrows the triage label list", async ({ page }) => {
  await page.getByPlaceholder("Search triage labels...").fill("Escalate");
  await expect(page.getByText("Escalate to authority")).toBeVisible();
  await expect(page.getByText("Urgent safety risk")).toHaveCount(0);
});

test("Add triage label navigates to the create form", async ({ page }) => {
  await page.getByRole("link", { name: "Add triage label" }).click();
  await expect(page).toHaveURL(/\/taxonomy\/triage-labels\/new$/);
  await expect(page.getByRole("heading", { level: 1, name: "Add triage label" })).toBeVisible();
});

test("choosing a bias or context indicator label group shows the wording reminder in the form", async ({ page }) => {
  await page.goto("/taxonomy/triage-labels/new");
  await expect(page.getByText(/Wording reminder/)).toHaveCount(0);

  await page.locator("#labelGroup").selectOption("bias_indicator");
  await expect(page.getByText(/not a confirmed hate crime, legal finding, diagnosis, or final/i)).toBeVisible();
});

test("a full create-then-publish flow succeeds for a triage label", async ({ page }) => {
  await page.goto("/taxonomy/triage-labels/new");
  await page.getByLabel("Name shown to administrators").fill("Needs interpreter support");
  await page.getByLabel("Short description").fill("Person has indicated they need an interpreter.");
  await page.locator("#labelGroup").selectOption("accessibility_need");
  await page.getByRole("button", { name: "Publish" }).click();

  await expect(page).toHaveURL(/\/taxonomy\/triage-labels\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Needs interpreter support" })).toBeVisible();
  await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();
});

test("editing an existing triage label locks the machine key field", async ({ page }) => {
  await page.goto("/taxonomy/triage-labels/demo-triage-urgent-safety-risk/edit");
  await expect(page.getByLabel("Stable key")).toHaveAttribute("readonly", "");
});

test("the wording reminder also appears on the detail page for a bias-indicator label", async ({ page }) => {
  await page.goto("/taxonomy/triage-labels/demo-triage-religious-bias");
  await expect(page.getByRole("heading", { level: 1, name: "Religious bias indicator" })).toBeVisible();
  await expect(page.getByText(/not a confirmed hate crime, legal finding, diagnosis, or final/i)).toBeVisible();
});

test("an invalid triage label id shows a safe not-found state", async ({ page }) => {
  await page.goto("/taxonomy/triage-labels/this-id-does-not-exist");
  await expect(page.getByText("Triage label not found")).toBeVisible();
});
