"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { useAdminRepository } from "@/components/providers/repository-provider";
import type { AuditEvent } from "@/lib/models/audit-event";

export function useDocumentAuditEvents(documentId: string): AuditEvent[] | undefined {
  const { repository } = useAdminRepository();

  return useLiveQuery(async () => {
    if (!repository) return undefined;
    const all = await repository.auditEvents.list();
    return all.filter((event) => event.entityType === "document" && event.entityId === documentId);
  }, [repository, documentId]);
}
