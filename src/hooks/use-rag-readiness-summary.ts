"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { useAdminRepository } from "@/components/providers/repository-provider";
import type { RagReadinessSummary } from "@/lib/legislation/readiness";

export function useRagReadinessSummary(): RagReadinessSummary | undefined {
  const { repository } = useAdminRepository();

  return useLiveQuery(async () => {
    if (!repository) return undefined;
    return repository.getRagReadinessSummary();
  }, [repository]);
}
