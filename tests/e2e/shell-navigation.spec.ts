import { expect, test } from "@playwright/test";

const NAV_ROUTES: { label: string; href: string; heading: string }[] = [
  { label: "Dashboard", href: "/dashboard", heading: "Dashboard" },
  { label: "Knowledge & Legislation", href: "/content/knowledge-legislation", heading: "Knowledge & Legislation" },
  { label: "Microcards", href: "/content/microcards", heading: "Microcards" },
  { label: "Rights & Legal Information", href: "/content/rights-legal-information", heading: "Rights & Legal Information" },
  { label: "Support Organisations", href: "/content/support-organisations", heading: "Support Organisations" },
  { label: "Advocates & Counsellors", href: "/content/advocates-counsellors", heading: "Advocates & Counsellors" },
  { label: "Reporting Destinations", href: "/content/reporting-destinations", heading: "Reporting Destinations" },
  { label: "Incident Types", href: "/taxonomy/incident-types", heading: "Incident Types" },
  { label: "Triage Labels", href: "/taxonomy/triage-labels", heading: "Triage Labels" },
  { label: "Resource Categories", href: "/taxonomy/resource-categories", heading: "Resource Categories" },
  { label: "Matching Rules", href: "/taxonomy/matching-rules", heading: "Matching Rules" },
  { label: "Review Queue", href: "/publishing/review-queue", heading: "Review Queue" },
  { label: "Audit History", href: "/publishing/audit-history", heading: "Audit History" },
  { label: "Settings", href: "/settings", heading: "Settings" },
];

test("root path redirects to the dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("the SafeSpeak logo renders in the sidebar", async ({ page }) => {
  await page.goto("/dashboard");
  const sidebar = page.locator("aside");
  await expect(sidebar.getByText("Safe")).toBeVisible();
  await expect(sidebar.getByText("Speak")).toBeVisible();
  await expect(sidebar.getByText("Admin", { exact: true })).toBeVisible();
});

test("sidebar groups render with their labelled sections", async ({ page }) => {
  await page.goto("/dashboard");
  const nav = page.getByRole("navigation", { name: "Admin navigation" });
  await expect(nav.getByText("Content")).toBeVisible();
  await expect(nav.getByText("Taxonomy & Matching")).toBeVisible();
  await expect(nav.getByText("Publishing")).toBeVisible();
});

for (const route of NAV_ROUTES) {
  test(`navigating to "${route.label}" opens a valid page with the right heading`, async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("navigation", { name: "Admin navigation" }).getByRole("link", { name: route.label }).click();
    await expect(page).toHaveURL(new RegExp(`${route.href}$`));
    await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
  });
}

test("the active route is exposed via aria-current for assistive tech", async ({ page }) => {
  await page.goto("/publishing/audit-history");
  const activeLink = page.getByRole("navigation", { name: "Admin navigation" }).getByRole("link", {
    name: "Audit History",
  });
  await expect(activeLink).toHaveAttribute("aria-current", "page");
});

test("an unknown route shows the not-found page instead of a crash", async ({ page }) => {
  await page.goto("/this-route-does-not-exist");
  await expect(page.getByText("Page not found")).toBeVisible();
  await page.getByRole("link", { name: "Back to Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("mobile navigation opens, lists every group, and closes without losing focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");

  const openButton = page.getByRole("button", { name: "Open navigation menu" });
  await expect(openButton).toBeVisible();
  await openButton.click();

  const dialog = page.getByRole("dialog", { name: "Admin navigation" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Settings" })).toBeVisible();

  await page.getByRole("button", { name: "Close navigation menu" }).click();
  await expect(dialog).toBeHidden();
  await expect(openButton).toBeFocused();
});

test("skip-to-content link is the first focusable element and moves focus to main", async ({ page }) => {
  await page.goto("/dashboard");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toBeFocused();
  await skipLink.click();
  await expect(page.locator("#main-content")).toBeFocused();
});

test("placeholder modules disclose they are a foundation, not completed CRUD", async ({ page }) => {
  await page.goto("/content/microcards");
  await expect(page.getByText(/full management coming in a later phase/i)).toBeVisible();
  await expect(page.getByText(/is not implemented yet/i)).toBeVisible();
});
