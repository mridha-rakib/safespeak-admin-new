/**
 * `distDir` is isolated per purpose via `NEXT_DIST_DIR` — set by
 * `scripts/run-next.mjs` (dev/build/start) and by `scripts/e2e-runner.mjs`
 * (E2E build/start). This is the permanent fix for a confirmed regression:
 * `next dev` and a `next build` (direct, or via the E2E runner) previously
 * both read/wrote the single default `.next` directory. Running a build
 * while a dev server was live overwrote the dev server's in-flight
 * dev-mode manifest with production-hashed asset filenames the dev server
 * was never going to request, so every CSS/JS chunk request 404'd — the
 * confirmed cause of both the raw-unstyled-HTML and the Chrome
 * "Page Unresponsive" regressions documented in docs/ARCHITECTURE.md
 * "Knowledge & Legislation tab regression" / "Phase 6.1 — build isolation."
 * Falls back to the default `.next` only if a command is ever run outside
 * the wrapper scripts (e.g. a raw `npx next dev`) — same behaviour as
 * before this fix, never worse.
 *
 * On Vercel, `distDir` is always forced back to `.next` regardless of
 * `NEXT_DIST_DIR`. Vercel's builder resolves `distDir` by evaluating this
 * file itself (outside `scripts/run-next.mjs`), where `NEXT_DIST_DIR` is
 * unset, so it always expects output in `.next` — while `pnpm run build`
 * (via the wrapper) was actually writing to `.next-build`. That mismatch
 * left Vercel unable to find the build output to deploy. `VERCEL=1` is set
 * automatically in every Vercel build/deploy environment.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  reactStrictMode: true,
  distDir: process.env.VERCEL ? ".next" : process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
