import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/taxonomy/incident-types");
  await expect(page.getByRole("heading", { level: 1, name: "Incident Types" })).toBeVisible();
});

test("seeded incident types load into the management table", async ({ page }) => {
  const table = page.getByRole("table", { name: "Incident types" });
  await expect(table).toBeVisible();
  await expect(table.getByText("Online harassment")).toBeVisible();
  await expect(table.getByText("workplace_discrimination")).toBeVisible();
});

test("search narrows the incident type list", async ({ page }) => {
  await page.getByPlaceholder("Search incident types...").fill("Hate speech");
  await expect(page.getByText("Hate speech incident")).toBeVisible();
  await expect(page.getByText("Online harassment")).toHaveCount(0);
});

test("archived incident types are hidden by default and shown once filtered in", async ({ page }) => {
  await expect(page.getByText("Physical assault (legacy)")).toHaveCount(0);
  await page.locator("#taxonomy-filter-status").selectOption("archived");
  await expect(page.getByText("Physical assault (legacy)")).toBeVisible();
});

test("demo filter narrows to only demo or only non-demo records", async ({ page }) => {
  await page.locator("#taxonomy-filter-demo").selectOption("non_demo_only");
  await expect(page.getByText("Online harassment")).toHaveCount(0);
});

test("clear filters restores the default list", async ({ page }) => {
  await page.locator("#taxonomy-filter-status").selectOption("draft");
  await expect(page.getByRole("button", { name: "Clear filters" })).toBeEnabled();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByText("Online harassment")).toBeVisible();
});

test("Add incident type navigates to the create form", async ({ page }) => {
  await page.getByRole("link", { name: "Add incident type" }).click();
  await expect(page).toHaveURL(/\/taxonomy\/incident-types\/new$/);
  await expect(page.getByRole("heading", { level: 1, name: "Add incident type" })).toBeVisible();
});

test("an invalid incident type id shows a safe not-found state instead of crashing", async ({ page }) => {
  await page.goto("/taxonomy/incident-types/this-id-does-not-exist");
  await expect(page.getByText("Incident type not found")).toBeVisible();
  await page.getByRole("link", { name: "Back to Incident Types" }).click();
  await expect(page).toHaveURL(/\/taxonomy\/incident-types$/);
});

test("the machine key is suggested from the name while creating, and remains editable before first save", async ({ page }) => {
  await page.goto("/taxonomy/incident-types/new");
  await page.getByLabel("Name shown to administrators and users").fill("Cyberstalking Behaviour");
  await expect(page.getByLabel("Stable key")).toHaveValue("cyberstalking_behaviour");

  await page.getByLabel("Stable key").fill("cyberstalking_custom");
  await expect(page.getByLabel("Stable key")).toHaveValue("cyberstalking_custom");
});

test("creating an incident type with a duplicate machine key is rejected with a clear error", async ({ page }) => {
  await page.goto("/taxonomy/incident-types/new");
  await page.getByLabel("Name shown to administrators and users").fill("Duplicate Test");
  await page.getByLabel("Stable key").fill("online_harassment");
  await page.getByLabel("Short description").fill("A description.");
  await page.getByRole("button", { name: "Save as draft" }).click();

  await expect(page.getByText(/already used by another incident type/i)).toBeVisible();
  await expect(page).toHaveURL(/\/taxonomy\/incident-types\/new$/);
});

test("an incomplete record blocks Ready for review and Publish in the form, and explains why", async ({ page }) => {
  await page.goto("/taxonomy/incident-types/new");
  await page.getByLabel("Name shown to administrators and users").fill("Missing Description Test");

  await expect(page.getByText(/A short description is required/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark ready for review" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save as draft" })).toBeEnabled();
});

test("a full create-then-publish flow succeeds and is reflected on the detail and list pages", async ({ page }) => {
  await page.goto("/taxonomy/incident-types/new");
  await page.getByLabel("Name shown to administrators and users").fill("Financial Coercion");
  await page.getByLabel("Short description").fill("Controlling or restricting someone's access to money.");
  await page.getByRole("button", { name: "Publish" }).click();

  await expect(page).toHaveURL(/\/taxonomy\/incident-types\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Financial Coercion" })).toBeVisible();
  await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();

  await page.goto("/taxonomy/incident-types");
  await expect(page.getByText("Financial Coercion")).toBeVisible();
});

test("editing an existing incident type locks the machine key field", async ({ page }) => {
  await page.goto("/taxonomy/incident-types/demo-incident-online-harassment/edit");
  const keyField = page.getByLabel("Stable key");
  await expect(keyField).toHaveAttribute("readonly", "");
  await expect(page.getByText(/cannot be changed after creation/i)).toBeVisible();
});

test("the detail page shows classification, publishing, and usage information", async ({ page }) => {
  await page.goto("/taxonomy/incident-types/demo-incident-online-harassment");
  await expect(page.getByRole("heading", { level: 1, name: "Online harassment" })).toBeVisible();
  await expect(page.getByText("online_harassment")).toBeVisible();
  await expect(page.getByText("Classification information")).toBeVisible();
  await expect(page.getByText("Publishing information")).toBeVisible();
  await expect(page.getByText("Where this is used")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Audit activity" })).toBeVisible();
});

test("browser back, forward, and refresh all work from the incident type list", async ({ page }) => {
  await page.getByText("Online harassment").click();
  await expect(page).toHaveURL(/\/taxonomy\/incident-types\/demo-incident-online-harassment$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/taxonomy\/incident-types$/);

  await page.goForward();
  await expect(page).toHaveURL(/\/taxonomy\/incident-types\/demo-incident-online-harassment$/);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Online harassment" })).toBeVisible();
});
