"use client";

import { IconPlus } from "@tabler/icons-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { ReorderPanel } from "@/components/taxonomy/reorder-panel";
import { ReplaceReferencesDialog } from "@/components/taxonomy/replace-references-dialog";
import { buildResourceCategoryColumns } from "@/components/taxonomy/resource-categories/columns";
import { TaxonomyFiltersPanel } from "@/components/taxonomy/taxonomy-filters-panel";
import { useAdminRepository } from "@/components/providers/repository-provider";
import { DataTable } from "@/components/table/data-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCrudList } from "@/hooks/use-crud-list";
import { useTaxonomyDataBundle } from "@/hooks/use-taxonomy-data-bundle";
import type { ResourceCategory } from "@/lib/models/resource-category";
import { computeTaxonomyUsage } from "@/lib/taxonomy/dependency-service";
import { applyTaxonomyListFilters, DEFAULT_TAXONOMY_LIST_FILTERS, type TaxonomyListFilters } from "@/lib/taxonomy/list-filters";

export default function ResourceCategoriesPage() {
  const { repository } = useAdminRepository();
  const records = useCrudList((repo) => repo.resourceCategories);
  const dataBundle = useTaxonomyDataBundle();
  const [filters, setFilters] = useState<TaxonomyListFilters>(DEFAULT_TAXONOMY_LIST_FILTERS);
  const [reorderMode, setReorderMode] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<ResourceCategory | null>(null);

  const filtered = useMemo(() => (records ? applyTaxonomyListFilters(records, filters) : records), [records, filters]);

  const columns = useMemo(
    () => (repository ? buildResourceCategoryColumns(repository, records ?? [], dataBundle, setReplaceTarget) : []),
    [repository, records, dataBundle]
  );

  const usage = replaceTarget && dataBundle ? computeTaxonomyUsage("resource_category", replaceTarget.id, dataBundle) : undefined;
  const candidates = replaceTarget ? (records ?? []).filter((r) => r.id !== replaceTarget.id && r.status !== "archived") : [];

  return (
    <>
      <PageHeader
        title="Resource Categories"
        description="The categories used to group support resources shown to users. Flat categories only — no nested hierarchy."
        actions={
          <Link href={"/taxonomy/resource-categories/new" as Route} className={buttonVariants()}>
            <IconPlus size={16} aria-hidden="true" />
            Add resource category
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
        <ReorderPanel records={records ?? []} repository={repository.resourceCategories} />
      ) : (
        <DataTable
          caption="Resource categories"
          columns={columns}
          data={filtered}
          searchPlaceholder="Search resource categories..."
          emptyTitle={records && records.length > 0 ? "No resource categories match the current filters" : "No resource categories yet"}
          emptyDescription={records && records.length > 0 ? "Try clearing filters." : "Choose Add resource category to create one."}
          pageSizeStorageKey="safespeak-admin:resource-categories:page-size"
        />
      )}

      {replaceTarget && repository && usage ? (
        <ReplaceReferencesDialog
          open={Boolean(replaceTarget)}
          onOpenChange={(open) => !open && setReplaceTarget(null)}
          source={replaceTarget}
          usage={usage}
          candidates={candidates}
          repository={repository.resourceCategories}
        />
      ) : null}
    </>
  );
}
