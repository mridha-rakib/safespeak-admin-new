"use client";

import { IconPlus } from "@tabler/icons-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { buildRightsContentColumns } from "@/components/rights-content/columns";
import { TaxonomyFiltersPanel } from "@/components/taxonomy/taxonomy-filters-panel";
import { useAdminRepository } from "@/components/providers/repository-provider";
import { DataTable } from "@/components/table/data-table";
import { buttonVariants } from "@/components/ui/button";
import { useCrudList } from "@/hooks/use-crud-list";
import { useTaxonomyDataBundle } from "@/hooks/use-taxonomy-data-bundle";
import { applyTaxonomyListFilters, DEFAULT_TAXONOMY_LIST_FILTERS, type TaxonomyListFilters } from "@/lib/taxonomy/list-filters";

export default function RightsLegalInformationPage() {
  const { repository } = useAdminRepository();
  const records = useCrudList((repo) => repo.rightsContent);
  const dataBundle = useTaxonomyDataBundle();
  const [filters, setFilters] = useState<TaxonomyListFilters>(DEFAULT_TAXONOMY_LIST_FILTERS);

  const filtered = useMemo(() => (records ? applyTaxonomyListFilters(records, filters) : records), [records, filters]);

  const columns = useMemo(
    () => (repository ? buildRightsContentColumns(repository.rightsContent, dataBundle) : []),
    [repository, dataBundle]
  );

  return (
    <>
      <PageHeader
        title="Rights & Legal Information"
        description="Plain-language explanations of rights, linked to source legislation. Educational only — never presented as personalised legal advice."
        actions={
          <Link href={"/content/rights-legal-information/new" as Route} className={buttonVariants()}>
            <IconPlus size={16} aria-hidden="true" />
            Add record
          </Link>
        }
      />

      <TaxonomyFiltersPanel filters={filters} onChange={setFilters} />

      <DataTable
        caption="Rights & Legal Information"
        columns={columns}
        data={filtered}
        searchPlaceholder="Search Rights & Legal Information..."
        emptyTitle={records && records.length > 0 ? "No records match the current filters" : "No Rights & Legal Information records yet"}
        emptyDescription={records && records.length > 0 ? "Try clearing filters." : "Choose Add record to create one."}
        pageSizeStorageKey="safespeak-admin:rights-content:page-size"
      />
    </>
  );
}
