"use client";

import { CONTENT_STATUSES } from "@/lib/models/base";
import { DEFAULT_TAXONOMY_LIST_FILTERS, isTaxonomyFilterActive, type TaxonomyListFilters } from "@/lib/taxonomy/list-filters";
import { cn } from "@/lib/utils";

const selectClass = "h-9 rounded-full border border-input bg-card px-3 text-xs text-foreground focus-visible:outline-none";

/** Shared by all three taxonomy list pages. */
export function TaxonomyFiltersPanel({
  filters,
  onChange,
}: {
  filters: TaxonomyListFilters;
  onChange: (next: TaxonomyListFilters) => void;
}) {
  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">Filter records</legend>

      <label className="sr-only" htmlFor="taxonomy-filter-status">
        Status
      </label>
      <select
        id="taxonomy-filter-status"
        className={selectClass}
        value={filters.status}
        onChange={(event) => onChange({ ...filters, status: event.target.value as TaxonomyListFilters["status"] })}
      >
        <option value="all">All statuses</option>
        {CONTENT_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status.replace(/_/g, " ")}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="taxonomy-filter-demo">
        Demo data
      </label>
      <select
        id="taxonomy-filter-demo"
        className={selectClass}
        value={filters.demoFilter}
        onChange={(event) => onChange({ ...filters, demoFilter: event.target.value as TaxonomyListFilters["demoFilter"] })}
      >
        <option value="all">Demo: any</option>
        <option value="demo_only">Demo only</option>
        <option value="non_demo_only">Non-demo only</option>
      </select>

      <label className="inline-flex items-center gap-1.5 text-xs text-foreground">
        <input
          type="checkbox"
          checked={filters.showArchived}
          onChange={(event) => onChange({ ...filters, showArchived: event.target.checked })}
        />
        Show archived
      </label>

      <button
        type="button"
        onClick={() => onChange(DEFAULT_TAXONOMY_LIST_FILTERS)}
        disabled={!isTaxonomyFilterActive(filters)}
        className={cn(
          "h-9 rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground hover:bg-secondary",
          "disabled:pointer-events-none disabled:opacity-40"
        )}
      >
        Clear filters
      </button>
    </fieldset>
  );
}
