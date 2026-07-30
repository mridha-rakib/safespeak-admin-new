"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { useAdminRepository } from "@/components/providers/repository-provider";
import type { TaxonomyDataBundle } from "@/lib/taxonomy/dependency-service";

/** UI-side equivalent of the repository's internal `buildTaxonomyDataBundle` — used by list pages to compute a usage count per row in one pass instead of one query per row. */
export function useTaxonomyDataBundle(): TaxonomyDataBundle | undefined {
  const { repository } = useAdminRepository();

  return useLiveQuery(async () => {
    if (!repository) return undefined;
    const [documents, microcards, rightsContent, supportOrganisations, supportProfessionals, reportingDestinations, matchingRules, incidentTypes, triageLabels, resourceCategories] =
      await Promise.all([
        repository.documents.list(),
        repository.microcards.list(),
        repository.rightsContent.list(),
        repository.supportOrganisations.list(),
        repository.supportProfessionals.list(),
        repository.reportingDestinations.list(),
        repository.matchingRules.list(),
        repository.incidentTypes.list(),
        repository.triageLabels.list(),
        repository.resourceCategories.list(),
      ]);
    return {
      documents,
      microcards,
      rightsContent,
      supportOrganisations,
      supportProfessionals,
      reportingDestinations,
      matchingRules,
      incidentTypes,
      triageLabels,
      resourceCategories,
    };
  }, [repository]);
}
