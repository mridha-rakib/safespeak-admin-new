"use client";

import { IconPlus } from "@tabler/icons-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { buildDestinationColumns } from "@/components/reporting-destinations/columns";
import { TaxonomyFiltersPanel } from "@/components/taxonomy/taxonomy-filters-panel";
import { useAdminRepository } from "@/components/providers/repository-provider";
import { DataTable } from "@/components/table/data-table";
import { buttonVariants } from "@/components/ui/button";
import { useCrudList } from "@/hooks/use-crud-list";
import { useTaxonomyDataBundle } from "@/hooks/use-taxonomy-data-bundle";
import { applyTaxonomyListFilters, DEFAULT_TAXONOMY_LIST_FILTERS, type TaxonomyListFilters } from "@/lib/taxonomy/list-filters";

export default function ReportingDestinationsPage() {
  const { repository } = useAdminRepository();
  const records = useCrudList((repo) => repo.reportingDestinations);
  const dataBundle = useTaxonomyDataBundle();
  const [filters, setFilters] = useState<TaxonomyListFilters>(DEFAULT_TAXONOMY_LIST_FILTERS);

  const filtered = useMemo(() => (records ? applyTaxonomyListFilters(records, filters) : records), [records, filters]);

  const eligibilityContext = useMemo(
    () => (dataBundle ? { resourceCategories: dataBundle.resourceCategories, supportOrganisations: dataBundle.supportOrganisations } : undefined),
    [dataBundle]
  );

  const columns = useMemo(
    () => (repository ? buildDestinationColumns(repository.reportingDestinations, eligibilityContext) : []),
    [repository, eligibilityContext]
  );

  return (
    <>
      <PageHeader
        title="Reporting Destinations"
        description="Where an incident can formally be reported — agencies, regulators, and internal offices."
        actions={
          <Link href={"/content/reporting-destinations/new" as Route} className={buttonVariants()} prefetch={false}>
            <IconPlus size={16} aria-hidden="true" />
            Add Reporting Destination
          </Link>
        }
      />

      <TaxonomyFiltersPanel filters={filters} onChange={setFilters} />

      <DataTable
        caption="Reporting destinations"
        columns={columns}
        data={filtered}
        searchPlaceholder="Search reporting destinations..."
        emptyTitle={records && records.length > 0 ? "No destinations match the current filters" : "No reporting destinations yet"}
        emptyDescription={records && records.length > 0 ? "Try clearing filters." : "Choose Add Reporting Destination to create one."}
        pageSizeStorageKey="safespeak-admin:reporting-destinations:page-size"
      />
    </>
  );
}
