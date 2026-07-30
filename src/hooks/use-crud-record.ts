"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { useAdminRepository } from "@/components/providers/repository-provider";
import type { AdminContentRepository, CrudRepository } from "@/lib/repositories/admin-content-repository";

/** Generic single-record hook — the `CrudRepository<T>` counterpart to hooks/use-taxonomy-record.ts, for domains (Microcards, Rights & Legal Information) that don't need the taxonomy-only surface. `undefined` = still loading, `null` = genuinely not found, otherwise the record. */
export function useCrudRecord<T extends { id: string }>(
  selector: (repository: AdminContentRepository) => CrudRepository<T>,
  id: string
): T | null | undefined {
  const { repository } = useAdminRepository();

  return useLiveQuery(async () => {
    if (!repository) return undefined;
    const record = await selector(repository).get(id);
    return record ?? null;
  }, [repository, id]);
}
