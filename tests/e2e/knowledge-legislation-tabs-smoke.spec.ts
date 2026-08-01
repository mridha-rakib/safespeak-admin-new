import { expect, test } from "@playwright/test";

/**
 * Regression coverage for the Knowledge & Legislation tab freeze / unstyled
 * page investigation. The confirmed root cause of both symptoms was a stale
 * `.next` dev-build directory (production-hashed chunk filenames colliding
 * with a live dev server's dev-mode asset requests), not a source-code
 * infinite loop — see docs/ARCHITECTURE.md "Knowledge & Legislation tab
 * regression." This test exercises the golden path (both remaining tabs,
 * repeated transitions, styled shell, no page-level overflow) so a real
 * regression in this area fails a build-backed E2E run, not just a
 * dev-server spot check.
 *
 * The "Processing issues" and "Test retrieval" tabs were removed from this
 * page's UI; their dedicated coverage
 * (knowledge-legislation-processing-issues.spec.ts,
 * knowledge-legislation-retrieval.spec.ts) was removed alongside them. The
 * underlying components still exist (`components/legislation/processing-
 * issues-tab.tsx`, `local-retrieval-tab.tsx`) if this is ever re-surfaced.
 */

const TABS = ["RAG readiness", "Documents"] as const;

test("both Knowledge & Legislation tabs switch repeatedly without freezing, erroring, or losing styling", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  const navigations: string[] = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  });

  await page.goto("/content/knowledge-legislation");

  // The styled application shell — not raw browser-default HTML. A real
  // stylesheet failure leaves the sidebar/header entirely unstyled, so
  // assert on an actual applied style rather than just element presence.
  await expect(page.getByRole("heading", { level: 1, name: "Knowledge & Legislation" })).toBeVisible();
  const bodyBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bodyBackground).not.toBe("rgba(0, 0, 0, 0)");
  expect(bodyBackground).not.toBe("rgb(255, 255, 255)");

  // The Documents panel, with seeded data loaded.
  const table = page.getByRole("table", { name: "Knowledge and legislation documents" });
  await expect(table).toBeVisible();
  await expect(table.locator("tbody tr").first()).toBeVisible();

  const initialNavigationCount = navigations.length;

  for (let round = 0; round < 5; round++) {
    for (const tabName of TABS) {
      const tab = page.getByRole("tab", { name: tabName, exact: true });
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true");

      if (tabName === "RAG readiness") {
        await expect(page.getByRole("table", { name: "Document readiness" })).toBeVisible();
      } else {
        await expect(table).toBeVisible();
      }

      // The main thread must still service a fresh round-trip after every
      // click — the same check style used to reproduce (and rule out) the
      // freeze during the audit. A genuinely hung tab would time out here.
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    }
  }

  // No uncaught page error across every tab switch.
  expect(pageErrors).toEqual([]);

  // Switching tabs is client-side state, never a full navigation.
  expect(navigations.length).toBe(initialNavigationCount);

  // No page-level horizontal overflow, in particular after landing back on Documents.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test("no page-level horizontal overflow at a narrow mobile viewport, across both tabs", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/content/knowledge-legislation");
  await expect(page.getByRole("heading", { level: 1, name: "Knowledge & Legislation" })).toBeVisible();

  for (const tabName of TABS) {
    await page.getByRole("tab", { name: tabName, exact: true }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect.soft(overflow, `"${tabName}" tab should not cause page-level horizontal overflow at 390px`).toBe(false);
  }
});
