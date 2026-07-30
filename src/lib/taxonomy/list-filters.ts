import type { ContentStatus } from "@/lib/models/base";

export interface TaxonomyListFilters {
  status: ContentStatus | "all";
  demoFilter: "all" | "demo_only" | "non_demo_only";
  /** When false and `status` is "all", archived records are hidden by default — pick status "archived" explicitly to see them. */
  showArchived: boolean;
}

export const DEFAULT_TAXONOMY_LIST_FILTERS: TaxonomyListFilters = {
  status: "all",
  demoFilter: "all",
  showArchived: false,
};

export function isTaxonomyFilterActive(filters: TaxonomyListFilters): boolean {
  return (
    filters.status !== DEFAULT_TAXONOMY_LIST_FILTERS.status ||
    filters.demoFilter !== DEFAULT_TAXONOMY_LIST_FILTERS.demoFilter ||
    filters.showArchived !== DEFAULT_TAXONOMY_LIST_FILTERS.showArchived
  );
}

export function applyTaxonomyListFilters<T extends { status: ContentStatus; isDemo: boolean }>(
  records: T[],
  filters: TaxonomyListFilters
): T[] {
  return records.filter((record) => {
    if (filters.status !== "all" && record.status !== filters.status) return false;
    if (filters.status === "all" && !filters.showArchived && record.status === "archived") return false;
    if (filters.demoFilter === "demo_only" && !record.isDemo) return false;
    if (filters.demoFilter === "non_demo_only" && record.isDemo) return false;
    return true;
  });
}
