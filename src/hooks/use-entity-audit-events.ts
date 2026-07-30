"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { useAdminRepository } from "@/components/providers/repository-provider";
import type { AuditEntityType, AuditEvent } from "@/lib/models/audit-event";

/** Generic version of hooks/use-document-audit-events.ts — any entity type/id pair. */
export function useEntityAuditEvents(entityType: AuditEntityType, entityId: string): AuditEvent[] | undefined {
  const { repository } = useAdminRepository();

  return useLiveQuery(async () => {
    if (!repository) return undefined;
    const all = await repository.auditEvents.list();
    return all.filter((event) => event.entityType === entityType && event.entityId === entityId);
  }, [repository, entityType, entityId]);
}
