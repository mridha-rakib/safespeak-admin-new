import { defineConfig, devices } from "@playwright/test";

const port = 3199;

/**
 * No `webServer` block here on purpose. Playwright's built-in webServer
 * orchestration (paired with `reuseExistingServer: true`, the local
 * default) was the primary source of this suite's flakiness: it silently
 * reused whatever was already listening on 3199 — including a server left
 * over from a previous timed-out run, sometimes serving a stale build after
 * a source change. `scripts/e2e-runner.mjs` now owns the entire lifecycle
 * instead (lock, stale-process reclaim, build, start, real HTTP readiness
 * poll, run, teardown, exit code) — see docs/E2E-TESTING.md "Why a custom
 * runner." Always invoke Playwright through `npm run test:e2e` (or one of
 * the other `test:e2e:*` scripts), never `npx playwright test` directly —
 * that would skip the runner and hit whatever happens to be on the port.
 *
 * Worker count: fixed at 2, not left at Playwright's local default (half
 * the CPU core count — 6 on the machine this was tuned on). Controlled
 * experiments (workers=1 / 2 / 6) on this suite's IndexedDB-per-context
 * model showed 2 is the highest count that stayed reproducibly stable
 * across full-suite runs; higher counts reintroduced the multi-minute
 * click-dispatch stalls documented in docs/E2E-TESTING.md.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  workers: 2,
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
