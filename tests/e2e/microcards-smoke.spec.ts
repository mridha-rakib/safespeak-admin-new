import { expect, test } from "@playwright/test";

/**
 * Critical smoke coverage for the Microcards module — the golden path plus
 * the dependency-protection/eligibility rules that are easy to silently
 * break, not a full historical regression suite. See docs/ARCHITECTURE.md
 * "Phase 4 testing scope."
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/content/microcards");
  await expect(page.getByRole("heading", { level: 1, name: "Microcards" })).toBeVisible();
});

test("seeded microcards load into the management table", async ({ page }) => {
  const table = page.getByRole("table", { name: "Microcards" });
  await expect(table).toBeVisible();
  await expect(table.getByText("Know your right to a safe workplace")).toBeVisible();
  await expect(table.getByText("What counts as racial harassment?")).toBeVisible();
});

test("Add microcard navigates to the create form and shows a live user-facing preview", async ({ page }) => {
  await page.getByRole("link", { name: "Add microcard" }).click();
  await expect(page).toHaveURL(/\/content\/microcards\/new$/);
  await expect(page.getByRole("heading", { level: 1, name: "Add microcard" })).toBeVisible();
  await expect(page.getByText("User-facing preview")).toBeVisible();

  await page.getByLabel("Title").fill("Preview title check");
  await expect(page.getByText("Preview title check")).toBeVisible();
});

test("Ready for review and Publish stay disabled until every required field is set, then a full create-to-publish flow succeeds", async ({ page }) => {
  await page.goto("/content/microcards/new");
  await page.getByLabel("Title").fill("Smoke test card");
  await page.getByLabel("Short guidance").fill("Short guidance for the smoke test card.");
  await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();

  await page.getByLabel("Full content").fill("Full body content for the smoke test card.");
  await page.getByLabel("Card type").selectOption({ label: "Quick guidance" });
  await page.getByLabel("Jurisdiction").selectOption({ label: "New South Wales" });
  await page.getByLabel("Review due date").fill("2027-01-01");
  await page.getByLabel("Resource category").selectOption({ label: "Legal rights" });

  await expect(page.getByRole("button", { name: "Publish" })).toBeEnabled();
  await page.getByRole("button", { name: "Publish" }).click();

  await expect(page).toHaveURL(/\/content\/microcards\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Smoke test card" })).toBeVisible();
  await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();
});

test("a call-to-action's target field changes to match the selected call-to-action type", async ({ page }) => {
  await page.goto("/content/microcards/new");
  await expect(page.getByLabel("Rights & Legal Information target")).toHaveCount(0);

  await page.getByLabel("Call-to-action type").selectOption({ label: "View a support service" });
  await expect(page.getByLabel("Support service target")).toBeVisible();

  await page.getByLabel("Call-to-action type").selectOption({ label: "Open a safe external link" });
  await expect(page.getByLabel(/External link/)).toBeVisible();
});

test("editing an existing microcard preloads its saved values", async ({ page }) => {
  await page.goto("/content/microcards/demo-microcard-know-your-right-to-a-safe-workplace/edit");
  await expect(page.getByLabel("Title")).toHaveValue("Know your right to a safe workplace");
});

test("a referenced draft microcard cannot be hard-deleted; an unreferenced eligible draft can", async ({ page }) => {
  await page.goto("/content/microcards/demo-microcard-document-an-incident-safely");
  await expect(page.getByRole("heading", { level: 1, name: "How to document an incident safely" })).toBeVisible();
  await page.getByRole("button", { name: "Delete draft" }).click();
  await page.getByRole("dialog", { name: "Delete this draft?" }).getByRole("button", { name: "Delete draft" }).click();
  await expect(page.getByText(/used by \d+ other record/i)).toBeVisible();
  // Dependency protection blocked the delete — still on the same detail page, not redirected away.
  await expect(page).toHaveURL(/\/content\/microcards\/demo-microcard-document-an-incident-safely$/);

  await page.goto("/content/microcards/demo-microcard-next-steps-after-reporting");
  await page.getByRole("button", { name: "Delete draft" }).click();
  await page.getByRole("dialog", { name: "Delete this draft?" }).getByRole("button", { name: "Delete draft" }).click();
  await expect(page).toHaveURL(/\/content\/microcards$/);
});

test("reorder mode moves a record and persists the new display order after Save order", async ({ page }) => {
  await page.getByRole("button", { name: "Reorder" }).click();
  const list = page.locator("ol").filter({ has: page.getByRole("button", { name: /^Move/ }) }).locator("li");
  await expect(list.first()).toContainText("Know your right to a safe workplace");

  await page.getByRole("button", { name: "Move Know your right to a safe workplace down" }).click();
  await expect(page.getByRole("status")).toContainText("moved to position 2");

  await page.getByRole("button", { name: "Save order" }).click();
  await expect(page.getByRole("status")).toContainText("Display order saved.");
});

test("the Review Queue lists a ready-for-review microcard with a View link back to it", async ({ page }) => {
  await page.goto("/publishing/review-queue");
  const row = page.getByRole("row", { name: /Need support right now\?/ });
  await expect(row).toBeVisible();
  await expect(row.getByRole("link", { name: "View" })).toHaveAttribute("href", "/content/microcards/demo-microcard-need-support-now");
});

test("the Dashboard's published-microcards stat card links to the Microcards module", async ({ page }) => {
  await page.goto("/dashboard");
  const card = page.getByRole("main").getByRole("link", { name: /published microcards/i });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/content\/microcards$/);
});
