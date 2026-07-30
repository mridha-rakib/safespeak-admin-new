"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { useAdminRepository } from "@/components/providers/repository-provider";
import type { AdminContentRepository, PublishableContentRepository } from "@/lib/repositories/admin-content-repository";
import type { UsageSummary } from "@/lib/taxonomy/dependency-service";

/** hooks/use-taxonomy-usage.ts's counterpart for `PublishableContentRepository<T>` (Microcards, Rights & Legal Information). */
export function useContentUsage<T extends { id: string }>(
  selector: (repository: AdminContentRepository) => PublishableContentRepository<T>,
  id: string
): UsageSummary | undefined {
  const { repository } = useAdminRepository();

  return useLiveQuery(async () => {
    if (!repository) return undefined;
    return selector(repository).getUsage(id);
  }, [repository, id]);
}
