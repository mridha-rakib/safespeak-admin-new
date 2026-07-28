import { z } from "zod";

import { contentStatusSchema, newId, nowIso } from "@/lib/models/base";

/**
 * Local, append-only audit log. This is browser history, not a
 * tamper-proof or server-backed audit trail — see README "Audit History"
 * for the exact wording used in the UI.
 */
export const AUDIT_ENTITY_TYPES = [
  "document",
  "microcard",
  "rights_content",
  "support_organisation",
  "support_professional",
  "reporting_destination",
  "incident_type",
  "triage_label",
  "resource_category",
  "matching_rule",
  "app_settings",
  "content_bundle",
] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export const AUDIT_ACTIONS = [
  "created",
  "updated",
  "status_changed",
  "deleted",
  "demo_data_seeded",
  "demo_data_reset",
  "bundle_exported",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const auditEventSchema = z.object({
  id: z.string().min(1),
  entityType: z.enum(AUDIT_ENTITY_TYPES),
  entityId: z.string().min(1),
  action: z.enum(AUDIT_ACTIONS),
  actor: z.string().min(1),
  timestamp: z.string().min(1),
  previousStatus: contentStatusSchema.optional(),
  nextStatus: contentStatusSchema.optional(),
  summary: z.string().min(1),
  isDemo: z.boolean().default(false),
});
export type AuditEvent = z.infer<typeof auditEventSchema>;

export function createAuditEvent(
  input: Omit<AuditEvent, "id" | "timestamp">
): AuditEvent {
  return {
    ...input,
    id: newId(),
    timestamp: nowIso(),
  };
}
