"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { useAdminRepository } from "@/components/providers/repository-provider";
import type { AdminContentRepository, TaxonomyRepository } from "@/lib/repositories/admin-content-repository";
import type { UsageSummary } from "@/lib/taxonomy/dependency-service";
import type { TaxonomyEntity } from "@/lib/taxonomy/types";

export function useTaxonomyUsage<T extends TaxonomyEntity>(
  selector: (repository: AdminContentRepository) => TaxonomyRepository<T>,
  id: string
): UsageSummary | undefined {
  const { repository } = useAdminRepository();

  return useLiveQuery(async () => {
    if (!repository) return undefined;
    return selector(repository).getUsage(id);
  }, [repository, id]);
}
