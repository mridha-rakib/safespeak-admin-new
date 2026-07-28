"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { useAdminRepository } from "@/components/providers/repository-provider";
import type { DashboardSummary } from "@/lib/repositories/admin-content-repository";

export function useDashboardSummary(): DashboardSummary | undefined {
  const { repository } = useAdminRepository();

  return useLiveQuery(async () => {
    if (!repository) return undefined;
    return repository.getDashboardSummary();
  }, [repository]);
}
