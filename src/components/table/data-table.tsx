"use client";

import {
  IconChevronLeft,
  IconChevronRight,
  IconSearch,
  IconSelector,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useEffect, useState, type ReactNode } from "react";

import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

function readStoredPageSize(storageKey: string | undefined): number {
  if (!storageKey || typeof window === "undefined") return DEFAULT_PAGE_SIZE;
  const raw = window.localStorage.getItem(storageKey);
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return PAGE_SIZE_OPTIONS.includes(parsed) ? parsed : DEFAULT_PAGE_SIZE;
}

export interface DataTableProps<T> {
  /** Accessible name for the table, used as the visually-hidden <caption>. */
  caption: string;
  columns: ColumnDef<T, unknown>[];
  /** `undefined` renders the loading state; `[]` renders the empty state. */
  data: T[] | undefined;
  error?: string | null;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  /** localStorage key used to remember the chosen page size across visits. */
  pageSizeStorageKey?: string;
}

export function DataTable<T>({
  caption,
  columns,
  data,
  error,
  searchPlaceholder = "Search...",
  emptyTitle = "No records yet",
  emptyDescription,
  pageSizeStorageKey,
}: DataTableProps<T>): ReactNode {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pageSize, setPageSize] = useState(() => readStoredPageSize(pageSizeStorageKey));

  useEffect(() => {
    if (pageSizeStorageKey && typeof window !== "undefined") {
      window.localStorage.setItem(pageSizeStorageKey, String(pageSize));
    }
  }, [pageSize, pageSizeStorageKey]);

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  useEffect(() => {
    table.setPageSize(pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  if (error) {
    return <Alert tone="destructive" title="This table couldn't load" role="alert">{error}</Alert>;
  }

  const isLoading = data === undefined;
  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative w-full max-w-xs">
          <span className="sr-only">Search {caption}</span>
          <IconSearch
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
            disabled={isLoading}
          />
        </label>
      </div>

      {isLoading ? (
        <div className="space-y-2" aria-live="polite" aria-busy="true">
          <span className="sr-only">Loading {caption}</span>
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-11 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">{caption}</caption>
            <thead className="bg-secondary/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sortDirection = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        className="px-4 py-3"
                        aria-sort={
                          sortDirection === "asc"
                            ? "ascending"
                            : sortDirection === "desc"
                              ? "descending"
                              : canSort
                                ? "none"
                                : undefined
                        }
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:outline-none"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sortDirection === "asc" ? (
                              <IconSortAscending size={14} aria-hidden="true" />
                            ) : sortDirection === "desc" ? (
                              <IconSortDescending size={14} aria-hidden="true" />
                            ) : (
                              <IconSelector size={14} aria-hidden="true" className="opacity-50" />
                            )}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-secondary/40">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && rows.length > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <label htmlFor="table-page-size" className="font-medium">
              Rows per page
            </label>
            <select
              id="table-page-size"
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="rounded-md border border-border bg-card px-2 py-1 text-xs focus-visible:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
            </span>
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full border border-border",
                "disabled:pointer-events-none disabled:opacity-40 hover:bg-secondary"
              )}
              aria-label="Previous page"
            >
              <IconChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full border border-border",
                "disabled:pointer-events-none disabled:opacity-40 hover:bg-secondary"
              )}
              aria-label="Next page"
            >
              <IconChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
