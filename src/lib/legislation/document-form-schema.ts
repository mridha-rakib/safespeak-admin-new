import { z } from "zod";

import { AUSTRALIAN_JURISDICTION_VALUES } from "@/lib/jurisdictions";
import {
  DOCUMENT_LICENSE_STATUSES,
  DOCUMENT_PRIORITIES,
  DOCUMENT_SOURCE_TYPES,
  type DocumentRecord,
} from "@/lib/models/document";

/**
 * Validates what the admin TYPES across steps 2–4 of the create/edit wizard.
 * This is deliberately stricter than `documentSchema` (which must accept a
 * bare-minimum draft for storage) — see lib/legislation/readiness.ts for the
 * separate "is this record allowed to publish" business rules, which check
 * the stored record as a whole rather than form input.
 */
export const documentFormSchema = z
  .object({
    title: z.string().min(1, "Enter a title or legislation name."),
    legislationName: z.string().optional(),
    sourceType: z.enum(DOCUMENT_SOURCE_TYPES),
    sourceCategory: z.string().min(1, "Enter a source category."),
    authorityOrPublisher: z.string().min(1, "Enter the authority or publisher."),
    jurisdiction: z.enum(AUSTRALIAN_JURISDICTION_VALUES, { message: "Select a jurisdiction." }),
    language: z.string().min(1, "Enter a language."),
    actNumber: z.string().optional(),
    documentVersionLabel: z.string().optional(),
    sourceUrl: z.union([z.url("Enter a valid URL."), z.literal("")]).optional(),

    effectiveDate: z.string().optional(),
    lastUpdatedDate: z.string().optional(),
    nextReviewDate: z.string().optional(),
    licenseStatus: z.enum(DOCUMENT_LICENSE_STATUSES),
    relevantSections: z.array(z.string().min(1)).default([]),
    topic: z.string().optional(),
    tags: z.array(z.string().min(1)).default([]),
    incidentTypeIds: z.array(z.string()).default([]),
    priority: z.enum(DOCUMENT_PRIORITIES),

    aiUsagePermission: z.boolean(),
    legalReviewComplete: z.boolean(),
    reviewNotes: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const { nextReviewDate, effectiveDate } = value;
    if (nextReviewDate && effectiveDate) {
      const next = new Date(nextReviewDate);
      const effective = new Date(effectiveDate);
      if (!Number.isNaN(next.getTime()) && !Number.isNaN(effective.getTime()) && next < effective) {
        ctx.addIssue({
          code: "custom",
          message: "The next review date should not be earlier than the effective date.",
          path: ["nextReviewDate"],
        });
      }
    }
  });

export type DocumentFormValues = z.infer<typeof documentFormSchema>;

export const STEP_FIELDS: Record<number, (keyof DocumentFormValues)[]> = {
  2: ["title", "sourceType", "sourceCategory", "authorityOrPublisher", "jurisdiction", "language", "sourceUrl"],
  3: ["nextReviewDate", "licenseStatus", "priority"],
  4: [],
};

export function defaultFormValues(doc?: DocumentRecord | null): DocumentFormValues {
  return {
    title: doc?.title ?? "",
    legislationName: doc?.legislationName ?? "",
    sourceType: doc?.sourceType ?? "legislation",
    sourceCategory: doc?.sourceCategory ?? "",
    authorityOrPublisher: doc?.authorityOrPublisher ?? "",
    jurisdiction: doc?.jurisdiction,
    language: doc?.language ?? "en",
    actNumber: doc?.actNumber ?? "",
    documentVersionLabel: doc?.documentVersionLabel ?? "",
    sourceUrl: doc?.sourceUrl ?? "",
    effectiveDate: doc?.effectiveDate ?? "",
    lastUpdatedDate: doc?.lastUpdatedDate ?? "",
    nextReviewDate: doc?.nextReviewDate ?? "",
    licenseStatus: doc?.licenseStatus ?? "unknown",
    relevantSections: doc?.relevantSections ?? [],
    topic: doc?.topic ?? "",
    tags: doc?.tags ?? [],
    incidentTypeIds: doc?.incidentTypeIds ?? [],
    priority: doc?.priority ?? "medium",
    aiUsagePermission: doc?.aiUsagePermission ?? false,
    legalReviewComplete: doc?.legalReviewComplete ?? false,
    reviewNotes: doc?.reviewNotes ?? "",
  } as DocumentFormValues;
}

/** Normalizes tags: trim, drop empties, case-preserving de-dupe. */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

/** Relevant sections: trim, drop empties, prevent exact duplicates (case-insensitive). */
export function normalizeRelevantSections(sections: string[]): string[] {
  return normalizeTags(sections);
}
