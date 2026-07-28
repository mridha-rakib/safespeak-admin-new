import { z } from "zod";

/**
 * Local publication workflow shared by every content domain. Legislation and
 * Advocates/Counsellors layer extra rules on top of this (see
 * lib/publishing/workflow.ts) — this enum is the vocabulary, not the policy.
 */
export const CONTENT_STATUSES = [
  "draft",
  "ready_for_review",
  "published",
  "needs_update",
  "archived",
] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const contentStatusSchema = z.enum(CONTENT_STATUSES);

/** The single local administrator identity used for audit metadata in this phase. */
export const LOCAL_ADMIN_ACTOR = "local-admin";

/**
 * Fields every managed (Dexie-backed) record carries. Domain schemas extend
 * this with `.extend({...})` rather than duplicating these fields.
 */
export const baseRecordSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  createdBy: z.string().min(1).default(LOCAL_ADMIN_ACTOR),
  updatedBy: z.string().min(1).default(LOCAL_ADMIN_ACTOR),
  isDemo: z.boolean().default(false),
  status: contentStatusSchema.default("draft"),
  version: z.number().int().nonnegative().default(1),
});
export type BaseRecord = z.infer<typeof baseRecordSchema>;

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for non-browser/test environments without a Web Crypto UUID.
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Fields to spread when creating a brand-new record. */
export function createBaseFields(overrides: Partial<BaseRecord> = {}): BaseRecord {
  const timestamp = nowIso();
  return {
    id: newId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: LOCAL_ADMIN_ACTOR,
    updatedBy: LOCAL_ADMIN_ACTOR,
    isDemo: false,
    status: "draft",
    version: 1,
    ...overrides,
  };
}
