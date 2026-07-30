"use client";

import { IconPlus } from "@tabler/icons-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { ReorderPanel } from "@/components/taxonomy/reorder-panel";
import { ReplaceReferencesDialog } from "@/components/taxonomy/replace-references-dialog";
import { buildIncidentTypeColumns } from "@/components/taxonomy/incident-types/columns";
import { TaxonomyFiltersPanel } from "@/components/taxonomy/taxonomy-filters-panel";
import { useAdminRepository } from "@/components/providers/repository-provider";
import { DataTable } from "@/components/table/data-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCrudList } from "@/hooks/use-crud-list";
import { useTaxonomyDataBundle } from "@/hooks/use-taxonomy-data-bundle";
import type { IncidentType } from "@/lib/models/incident-type";
import { computeTaxonomyUsage } from "@/lib/taxonomy/dependency-service";
import { applyTaxonomyListFilters, DEFAULT_TAXONOMY_LIST_FILTERS, type TaxonomyListFilters } from "@/lib/taxonomy/list-filters";

export default function IncidentTypesPage() {
  const { repository } = useAdminRepository();
  const records = useCrudList((repo) => repo.incidentTypes);
  const dataBundle = useTaxonomyDataBundle();
  const [filters, setFilters] = useState<TaxonomyListFilters>(DEFAULT_TAXONOMY_LIST_FILTERS);
  const [reorderMode, setReorderMode] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<IncidentType | null>(null);

  const filtered = useMemo(() => (records ? applyTaxonomyListFilters(records, filters) : records), [records, filters]);

  const columns = useMemo(
    () => (repository ? buildIncidentTypeColumns(repository, records ?? [], dataBundle, setReplaceTarget) : []),
    [repository, records, dataBundle]
  );

  const usage = replaceTarget && dataBundle ? computeTaxonomyUsage("incident_type", replaceTarget.id, dataBundle) : undefined;
  const candidates = replaceTarget ? (records ?? []).filter((r) => r.id !== replaceTarget.id && r.status !== "archived") : [];

  return (
    <>
      <PageHeader
        title="Incident Types"
        description="The controlled classifications used to categorise an incident. These are classification labels, not legal definitions."
        actions={
          <Link href={"/taxonomy/incident-types/new" as Route} className={buttonVariants()}>
            <IconPlus size={16} aria-hidden="true" />
            Add incident type
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
        <ReorderPanel records={records ?? []} repository={repository.incidentTypes} />
      ) : (
        <DataTable
          caption="Incident types"
          columns={columns}
          data={filtered}
          searchPlaceholder="Search incident types..."
          emptyTitle={records && records.length > 0 ? "No incident types match the current filters" : "No incident types yet"}
          emptyDescription={records && records.length > 0 ? "Try clearing filters." : "Choose Add incident type to create one."}
          pageSizeStorageKey="safespeak-admin:incident-types:page-size"
        />
      )}

      {replaceTarget && repository && usage ? (
        <ReplaceReferencesDialog
          open={Boolean(replaceTarget)}
          onOpenChange={(open) => !open && setReplaceTarget(null)}
          source={replaceTarget}
          usage={usage}
          candidates={candidates}
          repository={repository.incidentTypes}
        />
      ) : null}
    </>
  );
}
