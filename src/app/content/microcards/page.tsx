"use client";

import { IconPlus } from "@tabler/icons-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { MicrocardReorderPanel } from "@/components/microcards/microcard-reorder-panel";
import { buildMicrocardColumns } from "@/components/microcards/columns";
import { TaxonomyFiltersPanel } from "@/components/taxonomy/taxonomy-filters-panel";
import { useAdminRepository } from "@/components/providers/repository-provider";
import { DataTable } from "@/components/table/data-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCrudList } from "@/hooks/use-crud-list";
import { useTaxonomyDataBundle } from "@/hooks/use-taxonomy-data-bundle";
import { applyTaxonomyListFilters, DEFAULT_TAXONOMY_LIST_FILTERS, type TaxonomyListFilters } from "@/lib/taxonomy/list-filters";

export default function MicrocardsPage() {
  const { repository } = useAdminRepository();
  const records = useCrudList((repo) => repo.microcards);
  const dataBundle = useTaxonomyDataBundle();
  const [filters, setFilters] = useState<TaxonomyListFilters>(DEFAULT_TAXONOMY_LIST_FILTERS);
  const [reorderMode, setReorderMode] = useState(false);

  const filtered = useMemo(() => (records ? applyTaxonomyListFilters(records, filters) : records), [records, filters]);

  const columns = useMemo(
    () => (repository ? buildMicrocardColumns(repository.microcards, dataBundle) : []),
    [repository, dataBundle]
  );

  return (
    <>
      <PageHeader
        title="Microcards"
        description="Short, plain-language educational cards shown to users — quick guidance, safety tips, and next steps."
        actions={
          <Link href={"/content/microcards/new" as Route} className={buttonVariants()}>
            <IconPlus size={16} aria-hidden="true" />
            Add microcard
          </Link>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TaxonomyFiltersPanel filters={filters} onChange={setFilters} />
        <Button variant="outline" size="sm" onClick={() => setReorderMode((v) => !v)}>
          {reorderMode ? "Done reordering" : "Reorder"}
        </Button>
      </div>

      {reorderMode && repository ? (
        <MicrocardReorderPanel records={records ?? []} repository={repository.microcards} />
      ) : (
        <DataTable
          caption="Microcards"
          columns={columns}
          data={filtered}
          searchPlaceholder="Search microcards..."
          emptyTitle={records && records.length > 0 ? "No microcards match the current filters" : "No microcards yet"}
          emptyDescription={records && records.length > 0 ? "Try clearing filters." : "Choose Add microcard to create one."}
          pageSizeStorageKey="safespeak-admin:microcards:page-size"
        />
      )}
    </>
  );
}
