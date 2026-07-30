import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * Phase 6.1 — permanent prevention of the confirmed dev/build `.next`
 * collision (see docs/ARCHITECTURE.md "Phase 6.1 — build isolation" and
 * "Knowledge & Legislation tab regression"). The live, end-to-end proof
 * that this actually works — `next dev` staying healthy through a
 * concurrent `next build` AND a concurrent E2E build/start — was run
 * manually (not practical to automate as a fast unit test, since it
 * requires spawning real dev/build/e2e Next.js processes and probing a
 * live HTTP server). These are the fast, CI-safe structural checks that
 * pin the configuration those manual runs exercised.
 */

const ROOT = join(__dirname, "../..");

test("next.config.mjs derives distDir from NEXT_DIST_DIR, defaulting to the original \".next\"", () => {
  const source = readFileSync(join(ROOT, "next.config.mjs"), "utf8");
  assert.match(source, /distDir:\s*process\.env\.NEXT_DIST_DIR\s*\|\|\s*["']\.next["']/);
});

test("scripts/run-next.mjs maps dev/build/e2e to three distinct, non-default directory names", () => {
  const source = readFileSync(join(ROOT, "scripts", "run-next.mjs"), "utf8");
  const match = source.match(/DIST_DIR_BY_PURPOSE\s*=\s*\{([^}]+)\}/);
  assert.ok(match, "DIST_DIR_BY_PURPOSE map not found in scripts/run-next.mjs");

  const entries = [...match![1].matchAll(/(\w+):\s*["']([^"']+)["']/g)].map((m) => [m[1], m[2]] as const);
  const purposes = Object.fromEntries(entries);

  assert.equal(purposes.dev, ".next-dev");
  assert.equal(purposes.build, ".next-build");
  assert.equal(purposes.e2e, ".next-e2e");

  const distDirs = Object.values(purposes);
  assert.equal(new Set(distDirs).size, distDirs.length, "every purpose must map to a distinct directory");
  assert.ok(!distDirs.includes(".next"), "no purpose should reuse the bare default .next directory");
});

test("scripts/run-next.mjs never spawns the next CLI through a shell (avoids the detached-process failure mode already documented for scripts/e2e-runner.mjs)", () => {
  const source = readFileSync(join(ROOT, "scripts", "run-next.mjs"), "utf8");
  assert.doesNotMatch(source, /shell:\s*true/);
});

test("scripts/e2e-runner.mjs's own next build/start calls are isolated to .next-e2e, not the default or the production distDir", () => {
  const source = readFileSync(join(ROOT, "scripts", "e2e-runner.mjs"), "utf8");
  assert.match(source, /NEXT_DIST_DIR:\s*["']\.next-e2e["']/);

  const buildCallCount = (source.match(/env:\s*NEXT_E2E_ENV/g) ?? []).length;
  // One for the `next build` spawn, one for the `next start` spawn — both
  // legs of the E2E lifecycle must use the isolated env, not just one.
  assert.equal(buildCallCount, 2, "expected both the build and start spawn calls to pass env: NEXT_E2E_ENV");
});

test("package.json dev/build/start/start:e2e scripts all route through scripts/run-next.mjs with distinct purposes", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts: Record<string, string> };
  assert.match(pkg.scripts.dev, /run-next\.mjs dev dev/);
  assert.match(pkg.scripts.build, /run-next\.mjs build build/);
  assert.match(pkg.scripts.start, /run-next\.mjs build start/);
  assert.match(pkg.scripts["start:e2e"], /run-next\.mjs e2e start/);
});

test(".gitignore excludes every isolated build output directory", () => {
  const source = readFileSync(join(ROOT, ".gitignore"), "utf8");
  for (const dir of ["/.next/", "/.next-dev/", "/.next-build/", "/.next-e2e/"]) {
    assert.ok(source.includes(dir), `.gitignore is missing "${dir}"`);
  }
});
