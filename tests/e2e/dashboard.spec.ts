import { expect, test } from "@playwright/test";

test("dashboard cards show live counts sourced from the repository, labelled as demo data", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByText("Demo data", { exact: true })).toBeVisible();

  // Demo seed data always includes at least one published item and one advocate/counsellor.
  const publishedCard = page.getByRole("link", { name: /published content/i });
  await expect(publishedCard).toBeVisible();
  await expect(publishedCard.getByText(/^\d+$/)).toBeVisible();

  const advocatesCard = page.getByRole("link", { name: /advocates & counsellors/i });
  await expect(advocatesCard.getByText(/^\d+$/)).toBeVisible();
});

test("a dashboard stat card navigates to its related admin section", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("link", { name: /advocates & counsellors/i }).click();
  await expect(page).toHaveURL(/\/content\/advocates-counsellors$/);
});

test("recent local activity table lists seeded audit events", async ({ page }) => {
  await page.goto("/dashboard");
  const table = page.getByRole("table", { name: "Recent local activity" });
  await expect(table).toBeVisible();
  await expect(table.getByText("Demo data seeded")).toBeVisible();
});

test("advocates & counsellors preview shows a not-verified badge that never reads as verified", async ({ page }) => {
  await page.goto("/content/advocates-counsellors");
  const notVerifiedBadge = page.getByText("Not verified").first();
  await expect(notVerifiedBadge).toBeVisible();
  await expect(page.getByText("Publication does not imply verification")).toBeVisible();
});
