"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { useAdminRepository } from "@/components/providers/repository-provider";
import type { AdminContentRepository, CrudRepository } from "@/lib/repositories/admin-content-repository";

/** Generic list hook shared by every domain — one live-query wrapper instead of one per module. */
export function useCrudList<T extends { id: string }>(
  selector: (repository: AdminContentRepository) => CrudRepository<T>
): T[] | undefined {
  const { repository } = useAdminRepository();

  return useLiveQuery(async () => {
    if (!repository) return undefined;
    return selector(repository).list();
  }, [repository]);
}
