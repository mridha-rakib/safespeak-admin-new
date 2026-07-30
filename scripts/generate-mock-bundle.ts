#!/usr/bin/env -S tsx
/**
 * Phase 6 — deterministic mock bundle generation + admin→frontend contract
 * sync.
 *
 * There is no shared workspace/package linking `safespeak-admin` and
 * `safespeak-frontend` (each is an independently buildable app, its own git
 * repo, its own lockfile) — see docs/ARCHITECTURE.md "Phase 6 — canonical
 * contract strategy." This script is the one place that bridges them, and
 * it does so at BUILD TIME only (file generation), never at runtime: no
 * runtime import from one app into the other, no live IndexedDB access, no
 * browser-to-browser communication, no network call.
 *
 * What it does, in order:
 *  1. Reads this app's own deterministic demo/seed data (the same
 *     `seedX` arrays `ensureSeeded()` writes into IndexedDB) — the single
 *     source of truth for demo content, never a second hand-authored catalogue.
 *  2. Filters every domain to `status === "published"` (the same
 *     `statusFilter` policy `lib/bundle/export-bundle.ts` uses for a real
 *     Published Content Bundle export).
 *  3. Runs each domain's REAL `toPublishedXExport` transform — the same
 *     functions the live "Export Published Content Bundle" action in the
 *     Admin UI calls — so the generated fixture can never silently diverge
 *     from what a real admin-triggered export would produce.
 *  4. Validates every transformed record against the canonical contract's
 *     Zod schema (`lib/contract/published-content-contract.ts`). A mismatch
 *     here means the admin export shape and the contract have drifted —
 *     the script fails loudly rather than shipping a silently-wrong fixture.
 *  5. Drops any Matching Rule that references a record not present in this
 *     bundle (mirrors the same policy in `lib/bundle/export-bundle.ts`).
 *  6. Writes the validated bundle to this app's own
 *     `src/lib/contract/generated/published-content-bundle.json`.
 *  7. Copies that JSON file, `published-content-contract.ts`, and
 *     `lib/matching-rules/engine.ts` byte-for-byte into
 *     `safespeak-frontend/src/lib/contract/` and
 *     `safespeak-frontend/src/lib/matching-rules/` (sibling directory on
 *     disk — resolved relative to this script, never a hardcoded absolute
 *     path — the same relative nesting as this app, since engine.ts's own
 *     relative import of the contract file depends on it) and validates the
 *     frontend copy is byte-identical afterward.
 *
 * Usage (from safespeak-admin/):
 *   pnpm tsx scripts/generate-mock-bundle.ts            # generate + sync
 *   pnpm tsx scripts/generate-mock-bundle.ts --check     # verify only, no writes; exits 1 on drift
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ZodType } from "zod";

import {
  seedIncidentTypes,
  seedTriageLabels,
  seedResourceCategories,
  seedDocuments,
  seedMicrocards,
  seedRightsContent,
  seedSupportOrganisations,
  seedSupportProfessionals,
  seedReportingDestinations,
  seedMatchingRules,
} from "../src/lib/db/seed";
import { toPublishedIncidentTypeExport, toPublishedTriageLabelExport, toPublishedResourceCategoryExport } from "../src/lib/taxonomy/export-transform";
import { toPublishedLegislationExport } from "../src/lib/legislation/export-transform";
import { toPublishedMicrocardExport } from "../src/lib/microcards/export-transform";
import { toPublishedRightsContentExport } from "../src/lib/rights-content/export-transform";
import { toPublishedOrganisationExport } from "../src/lib/support-directory/organisation-export";
import { toPublishedProfessionalExport } from "../src/lib/support-directory/professional-export";
import { toPublishedDestinationExport } from "../src/lib/support-directory/destination-export";
import { toPublishedMatchingRuleExport } from "../src/lib/matching-rules/export-transform";
import {
  PUBLIC_CONTRACT_SCHEMA_VERSION,
  PUBLIC_CONTRACT_PURPOSE,
  publishedMockContentBundleSchema,
  publishedIncidentTypeSchema,
  publishedTriageLabelSchema,
  publishedResourceCategorySchema,
  publishedLegislationSourceSchema,
  publishedMicrocardSchema,
  publishedRightsContentSchema,
  publishedSupportOrganisationSchema,
  publishedSupportProfessionalSchema,
  publishedReportingDestinationSchema,
  publishedMatchingRuleSchema,
  type PublishedMockContentBundle,
} from "../src/lib/contract/published-content-contract";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ADMIN_ROOT = join(__dirname, "..");
const FRONTEND_ROOT = join(ADMIN_ROOT, "..", "safespeak-frontend");

/** Fixed (not `Date.now()`) so re-running this script without a content change produces a byte-identical, diff-free artifact — a real live export would use the current time instead; see lib/bundle/export-bundle.ts. */
const GENERATED_AT = "2026-06-01T09:00:00.000Z";

function published<T extends { status: string }>(records: T[]): T[] {
  return records.filter((r) => r.status === "published");
}

/**
 * `schema` is typed as `ZodType<T>` (not a loosely-shaped `{ safeParse }`)
 * so `T` is inferred from the actual schema passed at each call site instead
 * of defaulting to `unknown` — mirrors `validateDomain` in
 * lib/bundle/export-bundle.ts.
 */
function parseOrThrow<T>(schema: ZodType<T>, records: unknown[], domain: string): T[] {
  const valid: T[] = [];
  for (const record of records) {
    const result = schema.safeParse(record);
    if (!result.success) {
      console.error(`[generate-mock-bundle] Contract validation failed for domain "${domain}":`, result.error);
      process.exit(1);
    }
    valid.push(result.data);
  }
  return valid;
}

function buildBundle(): PublishedMockContentBundle {
  const incidentTypes = parseOrThrow(
    publishedIncidentTypeSchema,
    published(seedIncidentTypes).map(toPublishedIncidentTypeExport),
    "incidentTypes"
  );
  const triageLabels = parseOrThrow(
    publishedTriageLabelSchema,
    published(seedTriageLabels).map(toPublishedTriageLabelExport),
    "triageLabels"
  );
  const resourceCategories = parseOrThrow(
    publishedResourceCategorySchema,
    published(seedResourceCategories).map(toPublishedResourceCategoryExport),
    "resourceCategories"
  );
  const legislationSources = parseOrThrow(
    publishedLegislationSourceSchema,
    published(seedDocuments).map(toPublishedLegislationExport),
    "legislationSources"
  );
  const microcards = parseOrThrow(publishedMicrocardSchema, published(seedMicrocards).map(toPublishedMicrocardExport), "microcards");
  const rightsContent = parseOrThrow(
    publishedRightsContentSchema,
    published(seedRightsContent).map(toPublishedRightsContentExport),
    "rightsContent"
  );
  const supportOrganisations = parseOrThrow(
    publishedSupportOrganisationSchema,
    published(seedSupportOrganisations).map(toPublishedOrganisationExport),
    "supportOrganisations"
  );
  const supportProfessionals = parseOrThrow(
    publishedSupportProfessionalSchema,
    published(seedSupportProfessionals).map(toPublishedProfessionalExport),
    "supportProfessionals"
  );
  const reportingDestinations = parseOrThrow(
    publishedReportingDestinationSchema,
    published(seedReportingDestinations).map(toPublishedDestinationExport),
    "reportingDestinations"
  );
  const rawMatchingRules = parseOrThrow(
    publishedMatchingRuleSchema,
    published(seedMatchingRules).map(toPublishedMatchingRuleExport),
    "matchingRules"
  );

  const idSets = {
    microcardIds: new Set(microcards.map((r) => r.id)),
    rightsContentIds: new Set(rightsContent.map((r) => r.id)),
    supportOrganisationIds: new Set(supportOrganisations.map((r) => r.id)),
    supportProfessionalIds: new Set(supportProfessionals.map((r) => r.id)),
    reportingDestinationIds: new Set(reportingDestinations.map((r) => r.id)),
    legislationIds: new Set(legislationSources.map((r) => r.id)),
  };

  const warnings: string[] = [];
  const matchingRules = rawMatchingRules.filter((rule) => {
    const brokenField = (
      [
        ["microcardIds", idSets.microcardIds],
        ["rightsContentIds", idSets.rightsContentIds],
        ["supportOrganisationIds", idSets.supportOrganisationIds],
        ["supportProfessionalIds", idSets.supportProfessionalIds],
        ["reportingDestinationIds", idSets.reportingDestinationIds],
        ["legislationIds", idSets.legislationIds],
      ] as const
    ).find(([field, idSet]) => (rule[field] as string[]).some((id) => !idSet.has(id)));

    if (brokenField) {
      warnings.push(`Matching rule "${rule.name}" was excluded from this export because it references content not included in it.`);
      return false;
    }
    return true;
  });

  const data = {
    incidentTypes,
    triageLabels,
    resourceCategories,
    legislationSources,
    microcards,
    rightsContent,
    supportOrganisations,
    supportProfessionals,
    reportingDestinations,
    matchingRules,
  };

  const recordCounts = Object.fromEntries(Object.entries(data).map(([domain, records]) => [domain, records.length]));

  const bundle: PublishedMockContentBundle = {
    manifest: {
      schemaVersion: PUBLIC_CONTRACT_SCHEMA_VERSION,
      purpose: PUBLIC_CONTRACT_PURPOSE,
      generatedAt: GENERATED_AT,
      sourceApplication: "safespeak-admin",
      recordCounts,
      warnings,
    },
    data,
  };

  const finalCheck = publishedMockContentBundleSchema.safeParse(bundle);
  if (!finalCheck.success) {
    console.error("[generate-mock-bundle] Final bundle failed whole-bundle schema validation:", finalCheck.error);
    process.exit(1);
  }

  return bundle;
}

function main() {
  const checkOnly = process.argv.includes("--check");

  const bundle = buildBundle();
  const bundleJson = JSON.stringify(bundle, null, 2) + "\n";

  const adminGeneratedDir = join(ADMIN_ROOT, "src", "lib", "contract", "generated");
  const adminBundlePath = join(adminGeneratedDir, "published-content-bundle.json");

  if (checkOnly) {
    if (!existsSync(adminBundlePath) || readFileSync(adminBundlePath, "utf8") !== bundleJson) {
      console.error("[generate-mock-bundle] Admin bundle fixture is out of date. Run: pnpm tsx scripts/generate-mock-bundle.ts");
      process.exit(1);
    }
  } else {
    mkdirSync(adminGeneratedDir, { recursive: true });
    writeFileSync(adminBundlePath, bundleJson, "utf8");
  }

  if (!existsSync(FRONTEND_ROOT)) {
    console.warn(`[generate-mock-bundle] safespeak-frontend not found at ${FRONTEND_ROOT} — skipping frontend sync.`);
    return;
  }

  // Mirrors admin's own `src/lib/contract/` + `src/lib/matching-rules/`
  // layout exactly (not a frontend-specific "mock-contract" folder name) —
  // the copied engine.ts's relative import of `../contract/published-content-contract`
  // only resolves correctly if both apps keep this same relative nesting.
  const frontendContractDir = join(FRONTEND_ROOT, "src", "lib", "contract");
  const frontendMatchingRulesDir = join(FRONTEND_ROOT, "src", "lib", "matching-rules");
  const frontendBundlePath = join(frontendContractDir, "generated", "published-content-bundle.json");
  const filesToSync: Array<[string, string]> = [
    [join(ADMIN_ROOT, "src", "lib", "contract", "published-content-contract.ts"), join(frontendContractDir, "published-content-contract.ts")],
    [join(ADMIN_ROOT, "src", "lib", "matching-rules", "engine.ts"), join(frontendMatchingRulesDir, "engine.ts")],
  ];

  if (checkOnly) {
    let drift = false;
    for (const [src, dest] of filesToSync) {
      if (!existsSync(dest) || readFileSync(src, "utf8") !== readFileSync(dest, "utf8")) {
        console.error(`[generate-mock-bundle] Frontend copy is out of date: ${dest}`);
        drift = true;
      }
    }
    if (!existsSync(frontendBundlePath) || readFileSync(frontendBundlePath, "utf8") !== bundleJson) {
      console.error(`[generate-mock-bundle] Frontend bundle fixture is out of date.`);
      drift = true;
    }
    if (drift) process.exit(1);
    console.log("[generate-mock-bundle] Contract, engine, and bundle are in sync across both apps.");
    return;
  }

  mkdirSync(frontendContractDir, { recursive: true });
  mkdirSync(frontendMatchingRulesDir, { recursive: true });
  mkdirSync(dirname(frontendBundlePath), { recursive: true });
  for (const [src, dest] of filesToSync) {
    copyFileSync(src, dest);
  }
  writeFileSync(frontendBundlePath, bundleJson, "utf8");

  console.log(
    `[generate-mock-bundle] Generated bundle (${Object.entries(bundle.manifest.recordCounts)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ")}) and synced contract + engine + bundle to safespeak-frontend/src/lib/contract/ + src/lib/matching-rules/.`
  );
  if (bundle.manifest.warnings.length > 0) {
    console.warn("[generate-mock-bundle] Warnings:\n" + bundle.manifest.warnings.map((w) => `  - ${w}`).join("\n"));
  }
}

main();
