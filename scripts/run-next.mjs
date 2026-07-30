#!/usr/bin/env node
/**
 * Runs a Next.js CLI command with its build output directory isolated per
 * purpose, so `next dev`, a production `next build`/`next start`, and an
 * E2E `next build`/`next start` can never read or write the same `.next`
 * directory. See next.config.mjs for why this matters (a confirmed,
 * previously-manually-recovered regression — see docs/ARCHITECTURE.md
 * "Phase 6.1 — build isolation").
 *
 * A small Node wrapper rather than a new dependency (e.g. `cross-env`):
 * this only needs to set one env var and spawn one child process, and
 * spawning directly (never through a shell — see the same reasoning
 * already established in scripts/e2e-runner.mjs) works identically on
 * Windows, Git Bash, and POSIX shells without a `VAR=value cmd` prefix
 * that only some of those actually support.
 *
 * Usage: node scripts/run-next.mjs <purpose> <next-subcommand> [...next-args]
 *   purpose:         "dev" | "build" | "e2e"   (selects the isolated distDir)
 *   next-subcommand:  the actual `next` CLI command to run, e.g. "dev", "build", "start"
 *
 * Examples:
 *   node scripts/run-next.mjs dev dev --port 3100
 *   node scripts/run-next.mjs build build
 *   node scripts/run-next.mjs build start --port 3100
 *   node scripts/run-next.mjs e2e start --port 3199
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const DIST_DIR_BY_PURPOSE = {
  dev: ".next-dev",
  build: ".next-build",
  e2e: ".next-e2e",
};

const [, , purpose, nextSubcommand, ...nextArgs] = process.argv;
const distDir = DIST_DIR_BY_PURPOSE[purpose];

if (!distDir || !nextSubcommand) {
  console.error(
    `[run-next] Usage: node scripts/run-next.mjs <${Object.keys(DIST_DIR_BY_PURPOSE).join("|")}> <next-subcommand> [...args]`
  );
  process.exit(1);
}

const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

const child = spawn("node", [nextBin, nextSubcommand, ...nextArgs], {
  stdio: "inherit",
  cwd: ROOT,
  env: { ...process.env, NEXT_DIST_DIR: distDir },
});

child.on("error", (err) => {
  console.error(`[run-next] Failed to start "next ${nextSubcommand}": ${err.message}`);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[run-next] "next ${nextSubcommand}" was terminated by signal ${signal}.`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});

// Forward Ctrl-C / termination to the child so `next dev`/`next start` shuts
// down cleanly rather than being orphaned.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (!child.killed) child.kill(signal);
  });
}
