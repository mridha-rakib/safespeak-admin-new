import { z } from "zod";

import { contentStatusSchema } from "@/lib/models/base";

/**
 * Versioned export contract that will eventually let safespeak-frontend
 * consume admin-authored content. Nothing in this phase wires that
 * consumption up — see README "Bundle export format" for what exists today
 * versus what is deferred.
 *
 * Bumped from 1.0.0 to 1.1.0 when `purpose`, `includedStatuses`, and
 * `aiEligibilityPolicy` were added to the manifest (see "Published Content
 * Bundle vs Admin Backup" in the README) — a 1.0.0 consumer would not know
 * to check `purpose` before treating a bundle as user-facing.
 */
export const BUNDLE_SCHEMA_VERSION = "1.1.0";
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

/**
 * "published_content" is the default, user-facing export: published,
 * non-archived, non-draft records only — this is what a future
 * safespeak-frontend import step would consume. "admin_backup" may include
 * every local status for local restoration purposes and must never be
 * mistaken for the user-facing bundle — see README.
 */
export const BUNDLE_PURPOSES = ["published_content", "admin_backup"] as const;
export type BundlePurpose = (typeof BUNDLE_PURPOSES)[number];

export const AI_ELIGIBILITY_POLICY_DESCRIPTION =
  "A legislation record is AI-eligible only when it is published, not archived, AI Usage Permission is enabled, Legal Review Complete is true, local text extraction succeeded, and no blocking local processing issue remains.";

export const bundleManifestSchema = z.object({
  schemaVersion: z.literal(BUNDLE_SCHEMA_VERSION),
  purpose: z.enum(BUNDLE_PURPOSES),
  bundleVersion: z.string().min(1),
  generatedAt: z.string().min(1),
  sourceApplication: z.literal(SOURCE_APPLICATION),
  format: z.enum(["json", "zip"]),
  includesDemoData: z.boolean(),
  includesDocumentFiles: z.boolean(),
  /** Which BaseRecord.status values were eligible for inclusion — always `["published"]` for a published_content bundle. */
  includedStatuses: z.array(contentStatusSchema),
  aiEligibilityPolicy: z.string().min(1),
  recordCounts: z.record(z.enum(BUNDLE_DOMAINS), z.number().int().nonnegative()),
  checksums: z.record(z.enum(BUNDLE_DOMAINS), z.string()).optional(),
  warnings: z.array(z.string()).default([]),
});
export type BundleManifest = z.infer<typeof bundleManifestSchema>;

export const contentBundleHistorySchema = z.object({
  id: z.string().min(1),
  generatedAt: z.string().min(1),
  bundleVersion: z.string().min(1),
  purpose: z.enum(BUNDLE_PURPOSES),
  format: z.enum(["json", "zip"]),
  fileName: z.string().min(1),
  includesDemoData: z.boolean(),
  recordCounts: z.record(z.enum(BUNDLE_DOMAINS), z.number().int().nonnegative()),
  warningCount: z.number().int().nonnegative(),
});
export type ContentBundleHistoryEntry = z.infer<typeof contentBundleHistorySchema>;
