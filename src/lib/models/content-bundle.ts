import { z } from "zod";

/**
 * Versioned export contract that will eventually let safespeak-frontend
 * consume admin-authored content. Nothing in this phase wires that
 * consumption up — see README "Bundle export format" for what exists today
 * versus what is deferred.
 */
export const BUNDLE_SCHEMA_VERSION = "1.0.0";
export const SOURCE_APPLICATION = "safespeak-admin";

export const BUNDLE_DOMAINS = [
  "legislation",
  "documentChunks",
  "microcards",
  "rightsContent",
  "supportOrganisations",
  "supportProfessionals",
  "reportingDestinations",
  "incidentTypes",
  "triageLabels",
  "resourceCategories",
  "matchingRules",
] as const;
export type BundleDomain = (typeof BUNDLE_DOMAINS)[number];

export const bundleManifestSchema = z.object({
  schemaVersion: z.literal(BUNDLE_SCHEMA_VERSION),
  bundleVersion: z.string().min(1),
  generatedAt: z.string().min(1),
  sourceApplication: z.literal(SOURCE_APPLICATION),
  format: z.enum(["json", "zip"]),
  includesDemoData: z.boolean(),
  includesDocumentFiles: z.boolean(),
  recordCounts: z.record(z.enum(BUNDLE_DOMAINS), z.number().int().nonnegative()),
  checksums: z.record(z.enum(BUNDLE_DOMAINS), z.string()).optional(),
  warnings: z.array(z.string()).default([]),
});
export type BundleManifest = z.infer<typeof bundleManifestSchema>;

export const contentBundleHistorySchema = z.object({
  id: z.string().min(1),
  generatedAt: z.string().min(1),
  bundleVersion: z.string().min(1),
  format: z.enum(["json", "zip"]),
  fileName: z.string().min(1),
  includesDemoData: z.boolean(),
  recordCounts: z.record(z.enum(BUNDLE_DOMAINS), z.number().int().nonnegative()),
  warningCount: z.number().int().nonnegative(),
});
export type ContentBundleHistoryEntry = z.infer<typeof contentBundleHistorySchema>;
