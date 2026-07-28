import { defineConfig, devices } from "@playwright/test";

const port = 3199;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  webServer: {
    // Runs against a production build rather than `next dev` — dev mode
    // compiles each route on first visit (multiple seconds per route),
    // which made navigation assertions flaky. The build itself happens in
    // the "pretest:e2e" npm lifecycle script (run `npm run test:e2e`, not
    // `npx playwright test`, so that hook fires) — this command only starts
    // the already-built server, since chaining "build && start" as one
    // webServer command confused Playwright's process-exit tracking.
    command: "npm run start:e2e",
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
