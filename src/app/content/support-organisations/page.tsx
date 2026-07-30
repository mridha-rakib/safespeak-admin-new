"use client";

import { IconPlus } from "@tabler/icons-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { buildSupportOrganisationColumns } from "@/components/support-organisations/columns";
import { TaxonomyFiltersPanel } from "@/components/taxonomy/taxonomy-filters-panel";
import { useAdminRepository } from "@/components/providers/repository-provider";
import { DataTable } from "@/components/table/data-table";
import { buttonVariants } from "@/components/ui/button";
import { useCrudList } from "@/hooks/use-crud-list";
import { useTaxonomyDataBundle } from "@/hooks/use-taxonomy-data-bundle";
import { applyTaxonomyListFilters, DEFAULT_TAXONOMY_LIST_FILTERS, type TaxonomyListFilters } from "@/lib/taxonomy/list-filters";

export default function SupportOrganisationsPage() {
  const { repository } = useAdminRepository();
  const records = useCrudList((repo) => repo.supportOrganisations);
  const dataBundle = useTaxonomyDataBundle();
  const [filters, setFilters] = useState<TaxonomyListFilters>(DEFAULT_TAXONOMY_LIST_FILTERS);

  const filtered = useMemo(() => (records ? applyTaxonomyListFilters(records, filters) : records), [records, filters]);

  const columns = useMemo(
    () => (repository ? buildSupportOrganisationColumns(repository.supportOrganisations, dataBundle) : []),
    [repository, dataBundle]
  );

  return (
    <>
      <PageHeader
        title="Support Organisations"
        description="Organisations that offer support services. Listing an organisation here is not an endorsement — confirm current details directly with the service."
        actions={
          <Link href={"/content/support-organisations/new" as Route} className={buttonVariants()} prefetch={false}>
            <IconPlus size={16} aria-hidden="true" />
            Add Support Organisation
          </Link>
        }
      />

      <TaxonomyFiltersPanel filters={filters} onChange={setFilters} />

      <DataTable
        caption="Support organisations"
        columns={columns}
        data={filtered}
        searchPlaceholder="Search support organisations..."
        emptyTitle={records && records.length > 0 ? "No organisations match the current filters" : "No support organisations yet"}
        emptyDescription={records && records.length > 0 ? "Try clearing filters." : "Choose Add Support Organisation to create one."}
        pageSizeStorageKey="safespeak-admin:support-organisations:page-size"
      />
    </>
  );
}
