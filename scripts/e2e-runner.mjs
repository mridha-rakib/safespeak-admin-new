#!/usr/bin/env node
/**
 * Canonical E2E lifecycle for safespeak-admin.
 *
 * Owns the full sequence end to end so Playwright's own `webServer` block
 * never has to guess whether a port-3199 process is fresh, stale, or
 * unrelated: acquire a run lock -> refuse to start if a real run is already
 * active -> stop only a confirmed-stale safespeak-admin process on the test
 * port -> production build -> start exactly one `next start` server this
 * script owns -> poll real HTTP readiness -> run Playwright -> tear down the
 * exact server this run started -> release the lock -> exit with Playwright's
 * real exit code.
 *
 * Why this exists instead of Playwright's built-in `webServer` + npm
 * `pretest:e2e` hook: both were empirically unreliable in this environment.
 * `reuseExistingServer: true` (the local default) silently reused whatever
 * was already listening on 3199, including servers left over from a
 * previous timed-out run serving a stale build; and chaining the build into
 * an npm lifecycle hook occasionally detached from this script's own
 * process tracking, leaving the harness believing the run had finished
 * while `next build`/`next start` kept running in the background. See
 * docs/E2E-TESTING.md "Why a custom runner" for the full investigation.
 */
import { spawn, execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = 3199;
const HEALTH_URL = `http://localhost:${PORT}/`;
const LOCK_PATH = path.join(ROOT, ".e2e-run.lock");
const LOCK_STALE_MS = 30 * 60 * 1000; // 30 minutes — long enough for any real run, short enough to self-heal
const SERVER_READY_TIMEOUT_MS = 60_000;
const RUN_ID = crypto.randomUUID();
// Isolated from `.next` (dev) and `.next-build` (production) — see
// next.config.mjs + scripts/run-next.mjs. This is what makes it safe to run
// this E2E build/start while a `next dev` server is live on the same
// machine: they physically cannot write into or read from the same
// directory, so neither can corrupt the other's build manifest/assets.
const NEXT_E2E_ENV = { ...process.env, NEXT_DIST_DIR: ".next-e2e" };

const passthroughArgs = process.argv.slice(2);
const skipBuild = passthroughArgs.includes("--skip-build");
const forceClean = passthroughArgs.includes("--force-clean");
const playwrightArgs = passthroughArgs.filter((a) => a !== "--skip-build" && a !== "--force-clean");

function log(message) {
  console.log(`[e2e-runner] ${message}`);
}

function isWindows() {
  return os.platform() === "win32";
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Returns { pid, commandLine } for whatever process (if any) is listening on PORT, or null. */
function findProcessOnPort(port) {
  try {
    if (isWindows()) {
      const pidOut = execFileSync(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          `(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)`,
        ],
        { encoding: "utf8" }
      ).trim();
      if (!pidOut) return null;
      const pid = Number.parseInt(pidOut, 10);
      if (!Number.isFinite(pid)) return null;
      const commandLine = execFileSync(
        "powershell",
        ["-NoProfile", "-Command", `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}" -ErrorAction SilentlyContinue).CommandLine`],
        { encoding: "utf8" }
      ).trim();
      return { pid, commandLine };
    }
    const pidOut = execFileSync("lsof", ["-i", `:${port}`, "-sTCP:LISTEN", "-t"], { encoding: "utf8" }).trim();
    const pid = Number.parseInt(pidOut.split("\n")[0], 10);
    if (!Number.isFinite(pid)) return null;
    const commandLine = execFileSync("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" }).trim();
    return { pid, commandLine };
  } catch {
    return null;
  }
}

function killProcessTree(pid) {
  if (isWindows()) {
    try {
      execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      // already gone — fine
    }
  } else {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // already gone — fine
      }
    }
  }
}

/** Removes traces/screenshots/HTML report from a previous run so a fresh run's artefacts aren't mixed with stale ones. */
function cleanArtifacts() {
  for (const dir of ["test-results", "playwright-report"]) {
    const full = path.join(ROOT, dir);
    if (existsSync(full)) {
      rmSync(full, { recursive: true, force: true });
    }
  }
  log("Cleared test-results/ and playwright-report/ from any previous run.");
}

/**
 * Refuses to start a second concurrent run; safely reclaims a lock left by a
 * process that is no longer running or has clearly gone stale. `--force-clean`
 * additionally removes any existing lock unconditionally — an explicit,
 * user-requested recovery path for a wedged lock, not something a normal run
 * does on its own.
 */
function acquireLock() {
  if (forceClean && existsSync(LOCK_PATH)) {
    log("--force-clean passed: removing any existing lock unconditionally.");
    unlinkSync(LOCK_PATH);
  }
  if (existsSync(LOCK_PATH)) {
    let existing = null;
    try {
      existing = JSON.parse(readFileSync(LOCK_PATH, "utf8"));
    } catch {
      existing = null;
    }
    if (existing && typeof existing.runnerPid === "number" && isPidAlive(existing.runnerPid)) {
      const ageMs = Date.now() - existing.startedAt;
      if (ageMs < LOCK_STALE_MS) {
        console.error(
          `[e2e-runner] Another E2E run appears to be active (run ${existing.runId}, pid ${existing.runnerPid}, started ${(ageMs / 1000).toFixed(0)}s ago).\n` +
            `Refusing to start a second run against the same port/project. If you are certain no other run is active,\n` +
            `delete ${LOCK_PATH} and retry.`
        );
        process.exit(1);
      }
      log(`Existing lock is older than ${LOCK_STALE_MS / 60_000} minutes (pid still alive but presumed hung) — treating as stale.`);
    } else {
      log(`Stale lock found (owning process ${existing?.runnerPid ?? "unknown"} is not running) — reclaiming it.`);
    }
  }
  writeFileSync(LOCK_PATH, JSON.stringify({ runId: RUN_ID, runnerPid: process.pid, startedAt: Date.now() }, null, 2));
}

function releaseLock() {
  try {
    if (existsSync(LOCK_PATH)) {
      const existing = JSON.parse(readFileSync(LOCK_PATH, "utf8"));
      if (existing.runId === RUN_ID) unlinkSync(LOCK_PATH);
    }
  } catch {
    // best effort — a leftover lock from a crash is still safely reclaimed by acquireLock() next time
  }
}

/** Stops a confirmed-stale safespeak-admin process on PORT; refuses to touch anything unrelated. */
function reclaimPort() {
  const owner = findProcessOnPort(PORT);
  if (!owner) {
    log(`Port ${PORT} is free.`);
    return;
  }
  const belongsToThisProject = /safespeak-admin/i.test(owner.commandLine ?? "");
  if (!belongsToThisProject) {
    console.error(
      `[e2e-runner] Port ${PORT} is occupied by a process that does not look like it belongs to safespeak-admin (pid ${owner.pid}):\n` +
        `  ${owner.commandLine || "(command line unavailable)"}\n` +
        `Refusing to stop an unrelated process. Free the port manually and retry.`
    );
    process.exit(1);
  }
  log(`Port ${PORT} is occupied by a stale safespeak-admin process (pid ${owner.pid}) — stopping it before starting a fresh server.`);
  killProcessTree(owner.pid);
}

/**
 * Deliberately never uses `shell: true` (nor `npm run` / `npx`, which
 * require it on Windows via a `.cmd` wrapper). That shell indirection was
 * the actual cause of an earlier, very confusing failure mode in this
 * project: the wrapped child process would report "done" to its immediate
 * parent while the real work (a build, or here, the whole Playwright run)
 * kept executing detached in the background — this function ran, saw exit
 * code 1 within milliseconds, and returned before a single test had
 * actually started. Every command this script runs is invoked via its own
 * `node <entry-point.js>` so Node owns the child process directly with no
 * intermediate shell/batch layer to detach through.
 */
function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) reject(new Error(`${command} was terminated by signal ${signal}`));
      else resolve(code ?? 1);
    });
  });
}

async function waitForServerReady(deadlineMs) {
  const start = Date.now();
  while (Date.now() - start < deadlineMs) {
    try {
      const res = await fetch(HEALTH_URL, { redirect: "manual" });
      // Any HTTP response (including a redirect to /dashboard) means the
      // server is actually accepting and answering requests, not just that
      // the TCP port is open.
      if (res.status > 0) return;
    } catch {
      // not up yet — keep polling
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server did not become ready at ${HEALTH_URL} within ${deadlineMs}ms.`);
}

async function main() {
  process.chdir(ROOT);
  acquireLock();
  cleanArtifacts();
  reclaimPort();

  let serverProcess = null;
  let exitCode = 1;

  const teardown = () => {
    if (serverProcess && !serverProcess.killed) {
      log(`Stopping the test server this run started (pid ${serverProcess.pid}).`);
      killProcessTree(serverProcess.pid);
    }
    releaseLock();
  };

  // Best-effort teardown on Ctrl-C / external termination too, so a manually
  // interrupted run doesn't leave an orphaned server or a stale lock behind.
  const signalHandler = (signal) => () => {
    log(`Received ${signal} — tearing down before exit.`);
    teardown();
    process.exit(130);
  };
  process.once("SIGINT", signalHandler("SIGINT"));
  process.once("SIGTERM", signalHandler("SIGTERM"));

  try {
    if (!skipBuild) {
      log("Building E2E bundle (next build, isolated .next-e2e output)...");
      const buildCode = await run("node", [path.join(ROOT, "node_modules", "next", "dist", "bin", "next"), "build"], {
        env: NEXT_E2E_ENV,
      });
      if (buildCode !== 0) {
        console.error(`[e2e-runner] Production build failed with exit code ${buildCode}.`);
        process.exitCode = buildCode;
        return;
      }
    } else {
      log("Skipping build (--skip-build passed).");
    }

    log(`Starting E2E server on port ${PORT} (isolated .next-e2e output)...`);
    serverProcess = spawn("node", [path.join(ROOT, "node_modules", "next", "dist", "bin", "next"), "start", "--port", String(PORT)], {
      stdio: "inherit",
      cwd: ROOT,
      env: NEXT_E2E_ENV,
    });
    serverProcess.on("error", (err) => {
      console.error(`[e2e-runner] Failed to start the server: ${err.message}`);
    });

    await waitForServerReady(SERVER_READY_TIMEOUT_MS);
    log("Server is ready.");

    const playwrightCli = path.join(ROOT, "node_modules", "@playwright", "test", "cli.js");
    log(`Running Playwright: node ${path.relative(ROOT, playwrightCli)} test ${playwrightArgs.join(" ")}`.trim());
    exitCode = await run("node", [playwrightCli, "test", ...playwrightArgs]);
  } finally {
    teardown();
  }

  log(`Playwright exit code: ${exitCode}. No orphaned processes should remain for this run.`);
  process.exitCode = exitCode;
}

main().catch((err) => {
  console.error(`[e2e-runner] Fatal error: ${err.stack || err.message}`);
  releaseLock();
  process.exitCode = 1;
});
