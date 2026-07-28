import { z } from "zod";

import {
  BUNDLE_SCHEMA_VERSION,
  SOURCE_APPLICATION,
  type BundleDomain,
  type BundleManifest,
} from "@/lib/models/content-bundle";
import { documentChunkSchema } from "@/lib/models/document";
import { documentSchema } from "@/lib/models/document";
import { incidentTypeSchema } from "@/lib/models/incident-type";
import { matchingRuleSchema } from "@/lib/models/matching-rule";
import { microcardSchema } from "@/lib/models/microcard";
import { nowIso } from "@/lib/models/base";
import { reportingDestinationSchema } from "@/lib/models/reporting-destination";
import { resourceCategorySchema } from "@/lib/models/resource-category";
import { rightsContentSchema } from "@/lib/models/rights-content";
import { supportOrganisationSchema } from "@/lib/models/support-organisation";
import { supportProfessionalSchema } from "@/lib/models/support-professional";
import { triageLabelSchema } from "@/lib/models/triage-label";
import type { AdminContentRepository } from "@/lib/repositories/admin-content-repository";

export interface ContentBundle {
  manifest: BundleManifest;
  /** One JSON-serializable array per domain. Never contains Blob values, object URLs, or file-system paths. */
  data: Record<BundleDomain, unknown[]>;
}

export interface BuildBundleOptions {
  includeDemoData: boolean;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Validates every record against its own Zod schema before including it.
 * Records that fail validation are excluded and reported as a warning —
 * export continues rather than blocking entirely, since one corrupt record
 * should not prevent everything else from exporting.
 */
function validateDomain<T>(schema: z.ZodType<T>, records: unknown[], domain: BundleDomain, warnings: string[]): T[] {
  const valid: T[] = [];
  for (const record of records) {
    const result = schema.safeParse(record);
    if (result.success) {
      valid.push(result.data);
    } else {
      warnings.push(`Excluded 1 invalid "${domain}" record from the export.`);
    }
  }
  return valid;
}

export async function buildContentBundle(
  repository: AdminContentRepository,
  options: BuildBundleOptions
): Promise<ContentBundle> {
  const warnings: string[] = [];

  const [documents, microcards, rightsContent, supportOrganisations, supportProfessionals, reportingDestinations, incidentTypes, triageLabels, resourceCategories, matchingRules] =
    await Promise.all([
      repository.documents.list(),
      repository.microcards.list(),
      repository.rightsContent.list(),
      repository.supportOrganisations.list(),
      repository.supportProfessionals.list(),
      repository.reportingDestinations.list(),
      repository.incidentTypes.list(),
      repository.triageLabels.list(),
      repository.resourceCategories.list(),
      repository.matchingRules.list(),
    ]);

  const allChunks = (
    await Promise.all(documents.map((doc) => repository.documentChunks.listForDocument(doc.id)))
  ).flat();

  const filterDemo = <T extends { isDemo: boolean }>(records: T[]) =>
    options.includeDemoData ? records : records.filter((r) => !r.isDemo);

  const data: Record<BundleDomain, unknown[]> = {
    legislation: validateDomain(documentSchema, filterDemo(documents), "legislation", warnings),
    documentChunks: validateDomain(documentChunkSchema, allChunks, "documentChunks", warnings),
    microcards: validateDomain(microcardSchema, filterDemo(microcards), "microcards", warnings),
    rightsContent: validateDomain(rightsContentSchema, filterDemo(rightsContent), "rightsContent", warnings),
    supportOrganisations: validateDomain(
      supportOrganisationSchema,
      filterDemo(supportOrganisations),
      "supportOrganisations",
      warnings
    ),
    supportProfessionals: validateDomain(
      supportProfessionalSchema,
      filterDemo(supportProfessionals),
      "supportProfessionals",
      warnings
    ),
    reportingDestinations: validateDomain(
      reportingDestinationSchema,
      filterDemo(reportingDestinations),
      "reportingDestinations",
      warnings
    ),
    incidentTypes: validateDomain(incidentTypeSchema, filterDemo(incidentTypes), "incidentTypes", warnings),
    triageLabels: validateDomain(triageLabelSchema, filterDemo(triageLabels), "triageLabels", warnings),
    resourceCategories: validateDomain(
      resourceCategorySchema,
      filterDemo(resourceCategories),
      "resourceCategories",
      warnings
    ),
    matchingRules: validateDomain(matchingRuleSchema, filterDemo(matchingRules), "matchingRules", warnings),
  };

  const recordCounts = Object.fromEntries(
    Object.entries(data).map(([domain, records]) => [domain, records.length])
  ) as Record<BundleDomain, number>;

  const checksums = Object.fromEntries(
    await Promise.all(
      Object.entries(data).map(async ([domain, records]) => [domain, await sha256Hex(JSON.stringify(records))])
    )
  ) as Record<BundleDomain, string>;

  if (recordCounts.legislation > 0) {
    const documentsWithFiles = filterDemo(documents).filter((d) => d.file);
    if (documentsWithFiles.length > 0) {
      warnings.push(
        `${documentsWithFiles.length} document(s) have an uploaded PDF. Choose the ZIP export to include the underlying files.`
      );
    }
  }

  const manifest: BundleManifest = {
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    bundleVersion: nowIso(),
    generatedAt: nowIso(),
    sourceApplication: SOURCE_APPLICATION,
    format: "json",
    includesDemoData: options.includeDemoData,
    includesDocumentFiles: false,
    recordCounts,
    checksums,
    warnings,
  };

  return { manifest, data };
}

export function serializeBundleAsJson(bundle: ContentBundle): string {
  return JSON.stringify({ manifest: bundle.manifest, data: bundle.data }, null, 2);
}
