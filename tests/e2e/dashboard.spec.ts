import { expect, test } from "@playwright/test";

test("dashboard cards show live counts sourced from the repository, labelled as demo data", async ({ page }) => {
  await page.goto("/dashboard");

  // Scoped to <main> throughout this file: the sidebar also carries an
  // "Advocates & Counsellors" nav link (accessible name differs only in
  // case), which otherwise collides with the dashboard stat card's own
  // "Advocates & counsellors. View..." link under a case-insensitive regex.
  const main = page.getByRole("main");
  await expect(main.getByText("Demo data", { exact: true })).toBeVisible();

  // Demo seed data always includes at least one published item and one advocate/counsellor.
  const publishedCard = main.getByRole("link", { name: /published content/i });
  await expect(publishedCard).toBeVisible();
  await expect(publishedCard.getByText(/^\d+$/)).toBeVisible();

  const advocatesCard = main.getByRole("link", { name: /advocates & counsellors/i });
  await expect(advocatesCard.getByText(/^\d+$/)).toBeVisible();
});

test("a dashboard stat card navigates to its related admin section", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("main").getByRole("link", { name: /advocates & counsellors/i }).click();
  await expect(page).toHaveURL(/\/content\/advocates-counsellors$/);
});

test("recent local activity table lists seeded audit events", async ({ page }) => {
  await page.goto("/dashboard");
  const table = page.getByRole("table", { name: "Recent local activity" });
  await expect(table).toBeVisible();
  // Every seeded audit event shares the same "Demo data seeded" summary
  // badge text, so this table legitimately contains many matches — the
  // assertion only needs to confirm at least one row carries it.
  await expect(table.getByText("Demo data seeded").first()).toBeVisible();
});

test("advocates & counsellors preview shows a not-verified badge that never reads as verified", async ({ page }) => {
  await page.goto("/content/advocates-counsellors");
  const notVerifiedBadge = page.getByText("Not verified").first();
  await expect(notVerifiedBadge).toBeVisible();
  await expect(page.getByText("Publication does not imply verification")).toBeVisible();
});
