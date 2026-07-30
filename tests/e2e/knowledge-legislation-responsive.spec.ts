import { expect, test } from "@playwright/test";

const VIEWPORTS: { name: string; width: number; height: number }[] = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1536x864", width: 1536, height: 864 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "tablet-834", width: 834, height: 1112 },
  { name: "mobile-390", width: 390, height: 844 },
];

const ROUTES = [
  "/content/knowledge-legislation",
  "/content/knowledge-legislation/demo-doc-discrimination-act-guide",
  "/content/knowledge-legislation/new",
];

for (const viewport of VIEWPORTS) {
  for (const route of ROUTES) {
    test(`no page-level horizontal overflow at ${viewport.name} on ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // 1px tolerance for scrollbar rounding
    });
  }
}
