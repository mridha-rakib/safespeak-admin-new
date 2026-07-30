"use client";

import { IconPlus } from "@tabler/icons-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";

import { buildProfessionalColumns } from "@/components/advocates-counsellors/columns";
import { PageHeader } from "@/components/layout/page-header";
import { TaxonomyFiltersPanel } from "@/components/taxonomy/taxonomy-filters-panel";
import { useAdminRepository } from "@/components/providers/repository-provider";
import { DataTable } from "@/components/table/data-table";
import { buttonVariants } from "@/components/ui/button";
import { useCrudList } from "@/hooks/use-crud-list";
import { useTaxonomyDataBundle } from "@/hooks/use-taxonomy-data-bundle";
import { applyTaxonomyListFilters, DEFAULT_TAXONOMY_LIST_FILTERS, type TaxonomyListFilters } from "@/lib/taxonomy/list-filters";

export default function AdvocatesCounsellorsPage() {
  const { repository } = useAdminRepository();
  const records = useCrudList((repo) => repo.supportProfessionals);
  const organisationsList = useCrudList((repo) => repo.supportOrganisations);
  const dataBundle = useTaxonomyDataBundle();
  const [filters, setFilters] = useState<TaxonomyListFilters>(DEFAULT_TAXONOMY_LIST_FILTERS);

  const filtered = useMemo(() => (records ? applyTaxonomyListFilters(records, filters) : records), [records, filters]);
  const organisations = useMemo(() => organisationsList ?? [], [organisationsList]);
  const eligibilityContext = useMemo(
    () => (dataBundle ? { resourceCategories: dataBundle.resourceCategories, supportOrganisations: dataBundle.supportOrganisations } : undefined),
    [dataBundle]
  );

  const columns = useMemo(
    () => (repository ? buildProfessionalColumns(repository.supportProfessionals, organisations, eligibilityContext) : []),
    [repository, organisations, eligibilityContext]
  );

  return (
    <>
      <PageHeader
        title="Advocates & Counsellors"
        description="Individual support professionals. A profile may be published while its verification is still incomplete — publication never implies verification."
        actions={
          <Link href={"/content/advocates-counsellors/new" as Route} className={buttonVariants()} prefetch={false}>
            <IconPlus size={16} aria-hidden="true" />
            Add Advocate or Counsellor
          </Link>
        }
      />

      <TaxonomyFiltersPanel filters={filters} onChange={setFilters} />

      <DataTable
        caption="Advocates & Counsellors"
        columns={columns}
        data={filtered}
        searchPlaceholder="Search advocates & counsellors..."
        emptyTitle={records && records.length > 0 ? "No profiles match the current filters" : "No advocates or counsellors yet"}
        emptyDescription={records && records.length > 0 ? "Try clearing filters." : "Choose Add Advocate or Counsellor to create one."}
        pageSizeStorageKey="safespeak-admin:advocates-counsellors:page-size"
      />
    </>
  );
}
