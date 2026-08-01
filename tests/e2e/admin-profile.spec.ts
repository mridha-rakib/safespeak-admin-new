import { expect, test, type Page } from "@playwright/test";

/**
 * Phase 8.4 — the Admin self-profile: reachable from the Header's account
 * trigger (previously an inert "Local Administrator" span with no click
 * target at all). This is the logged-in Admin's own profile only — there is
 * no Admin registration, no Admin directory, and no way to browse other
 * users from here.
 */

async function openAccountMenu(page: Page) {
  const trigger = page.getByRole("button", { name: /open your admin profile/i });
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.getByRole("menu")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/dashboard");
  // The Header's account trigger reads from IndexedDB (useAdminAccount, via
  // RepositoryProvider's async Dexie open + seed). Clicking it before that
  // settles — i.e. right after goto()'s default "load" wait, which fires
  // before that client-side effect finishes — reproducibly stalls the click
  // dispatch. Waiting for the page to go idle gives it room to finish first.
  await page.waitForLoadState("networkidle");
});

test("the Header account trigger is a real, clickable menu showing the admin's name", async ({ page }) => {
  const trigger = page.getByRole("button", { name: /open your admin profile/i });
  await expect(trigger).toBeVisible();
  await expect(trigger).toContainText("Local Administrator");
});

test("opening the account menu offers 'My profile' and 'Settings', with no sign-out or user-management item", async ({ page }) => {
  await openAccountMenu(page);
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem", { name: "My profile" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Settings" })).toBeVisible();
  await expect(menu.getByText(/sign out/i)).toHaveCount(0);
  await expect(menu.getByText(/register/i)).toHaveCount(0);
});

test("'My profile' opens the canonical Admin self-profile route", async ({ page }) => {
  await openAccountMenu(page);
  await page.getByRole("menuitem", { name: "My profile" }).click();

  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole("heading", { level: 1, name: "My Profile" })).toBeVisible();
  await expect(page.getByText("Role summary")).toBeVisible();
  await expect(page.getByText(/full access to this browser's local content/i)).toBeVisible();
});

test("the profile has no Admin registration, invitation, or user-management affordance", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.getByText(/register.{0,20}admin/i)).toHaveCount(0);
  await expect(page.getByText(/invite.{0,20}admin/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /view all users/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /delete account/i })).toHaveCount(0);
});

test("editing the display name: edit, cancel restores the prior value without saving", async ({ page }) => {
  await page.goto("/profile");
  await page.getByRole("button", { name: "Edit profile" }).click();

  const nameInput = page.getByLabel("Display name");
  await nameInput.fill("Temporary Name");
  await page.getByRole("button", { name: "Cancel" }).click();

  await expect(page.getByText("Local Administrator", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Temporary Name")).toHaveCount(0);
});

test("editing and saving the display name persists on this device, updates the header, and survives a refresh", async ({ page }) => {
  await page.goto("/profile");
  await page.getByRole("button", { name: "Edit profile" }).click();

  const nameInput = page.getByLabel("Display name");
  await nameInput.fill("Priya Nair");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Profile saved on this device.")).toBeVisible();
  await expect(page.getByRole("button", { name: /open your admin profile/i })).toContainText("Priya Nair");

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "My Profile" })).toBeVisible();
  await expect(page.getByText("Priya Nair", { exact: true }).first()).toBeVisible();

  // Restore the default so this spec is repeatable across runs.
  await page.getByRole("button", { name: "Edit profile" }).click();
  await page.getByLabel("Display name").fill("Local Administrator");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Profile saved on this device.")).toBeVisible();
});

test("saving an empty display name shows a validation message instead of silently failing", async ({ page }) => {
  await page.goto("/profile");
  await page.getByRole("button", { name: "Edit profile" }).click();
  await page.getByLabel("Display name").fill("");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText(/display name can't be empty/i)).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
});

test("mobile viewport: the account trigger stays visible and reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("button", { name: /open your admin profile/i })).toBeVisible();
  await openAccountMenu(page);
  await page.getByRole("menuitem", { name: "My profile" }).click();
  await expect(page).toHaveURL(/\/profile$/);
});
