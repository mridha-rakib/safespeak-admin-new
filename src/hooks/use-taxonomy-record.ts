"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { useAdminRepository } from "@/components/providers/repository-provider";
import type { AdminContentRepository, TaxonomyRepository } from "@/lib/repositories/admin-content-repository";
import type { TaxonomyEntity } from "@/lib/taxonomy/types";

/** `undefined` = still loading, `null` = genuinely not found, otherwise the record. Mirrors hooks/use-document.ts. */
export function useTaxonomyRecord<T extends TaxonomyEntity>(
  selector: (repository: AdminContentRepository) => TaxonomyRepository<T>,
  id: string
): T | null | undefined {
  const { repository } = useAdminRepository();

  return useLiveQuery(async () => {
    if (!repository) return undefined;
    const record = await selector(repository).get(id);
    return record ?? null;
  }, [repository, id]);
}
