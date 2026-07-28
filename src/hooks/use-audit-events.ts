"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { useAdminRepository } from "@/components/providers/repository-provider";
import type { AuditEvent } from "@/lib/models/audit-event";

export function useAuditEvents(): AuditEvent[] | undefined {
  const { repository } = useAdminRepository();

  return useLiveQuery(async () => {
    if (!repository) return undefined;
    return repository.auditEvents.list();
  }, [repository]);
}
