"use client";

import { IconPlus } from "@tabler/icons-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { ReorderPanel } from "@/components/taxonomy/reorder-panel";
import { ReplaceReferencesDialog } from "@/components/taxonomy/replace-references-dialog";
import { buildTriageLabelColumns } from "@/components/taxonomy/triage-labels/columns";
import { TaxonomyFiltersPanel } from "@/components/taxonomy/taxonomy-filters-panel";
import { useAdminRepository } from "@/components/providers/repository-provider";
import { DataTable } from "@/components/table/data-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCrudList } from "@/hooks/use-crud-list";
import { useTaxonomyDataBundle } from "@/hooks/use-taxonomy-data-bundle";
import type { TriageLabel } from "@/lib/models/triage-label";
import { computeTaxonomyUsage } from "@/lib/taxonomy/dependency-service";
import { applyTaxonomyListFilters, DEFAULT_TAXONOMY_LIST_FILTERS, type TaxonomyListFilters } from "@/lib/taxonomy/list-filters";

export default function TriageLabelsPage() {
  const { repository } = useAdminRepository();
  const records = useCrudList((repo) => repo.triageLabels);
  const dataBundle = useTaxonomyDataBundle();
  const [filters, setFilters] = useState<TaxonomyListFilters>(DEFAULT_TAXONOMY_LIST_FILTERS);
  const [reorderMode, setReorderMode] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<TriageLabel | null>(null);

  const filtered = useMemo(() => (records ? applyTaxonomyListFilters(records, filters) : records), [records, filters]);

  const columns = useMemo(
    () => (repository ? buildTriageLabelColumns(repository, records ?? [], dataBundle, setReplaceTarget) : []),
    [repository, records, dataBundle]
  );

  const usage = replaceTarget && dataBundle ? computeTaxonomyUsage("triage_label", replaceTarget.id, dataBundle) : undefined;
  const candidates = replaceTarget ? (records ?? []).filter((r) => r.id !== replaceTarget.id && r.status !== "archived") : [];

  return (
    <>
      <PageHeader
        title="Triage Labels"
        description="Safety, urgency, and support labels used to help prioritise and route an incident. Bias and context labels are indicators, never a confirmed finding."
        actions={
          <Link href={"/taxonomy/triage-labels/new" as Route} className={buttonVariants()}>
            <IconPlus size={16} aria-hidden="true" />
            Add triage label
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
        <ReorderPanel records={records ?? []} repository={repository.triageLabels} />
      ) : (
        <DataTable
          caption="Triage labels"
          columns={columns}
          data={filtered}
          searchPlaceholder="Search triage labels..."
          emptyTitle={records && records.length > 0 ? "No triage labels match the current filters" : "No triage labels yet"}
          emptyDescription={records && records.length > 0 ? "Try clearing filters." : "Choose Add triage label to create one."}
          pageSizeStorageKey="safespeak-admin:triage-labels:page-size"
        />
      )}

      {replaceTarget && repository && usage ? (
        <ReplaceReferencesDialog
          open={Boolean(replaceTarget)}
          onOpenChange={(open) => !open && setReplaceTarget(null)}
          source={replaceTarget}
          usage={usage}
          candidates={candidates}
          repository={repository.triageLabels}
        />
      ) : null}
    </>
  );
}
