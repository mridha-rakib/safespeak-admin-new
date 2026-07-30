"use client";

import { AUSTRALIAN_JURISDICTIONS } from "@/lib/jurisdictions";
import { DEFAULT_DOCUMENT_FILTERS, isDocumentFilterActive, type DocumentFilterState } from "@/lib/legislation/document-filters";
import { CONTENT_STATUSES } from "@/lib/models/base";
import { DOCUMENT_PROCESSING_STATUSES, DOCUMENT_SOURCE_TYPES } from "@/lib/models/document";
import { cn } from "@/lib/utils";

const selectClass =
  "h-9 rounded-full border border-input bg-card px-3 text-xs text-foreground focus-visible:outline-none";

export function DocumentFiltersPanel({
  filters,
  onChange,
}: {
  filters: DocumentFilterState;
  onChange: (next: DocumentFilterState) => void;
}) {
  function set<K extends keyof DocumentFilterState>(key: K, value: DocumentFilterState[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">Filter documents</legend>

      <label className="sr-only" htmlFor="filter-status">
        Status
      </label>
      <select id="filter-status" className={selectClass} value={filters.status} onChange={(e) => set("status", e.target.value as DocumentFilterState["status"])}>
        <option value="all">All statuses</option>
        {CONTENT_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status.replace(/_/g, " ")}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="filter-jurisdiction">
        Jurisdiction
      </label>
      <select
        id="filter-jurisdiction"
        className={selectClass}
        value={filters.jurisdiction}
        onChange={(e) => set("jurisdiction", e.target.value)}
      >
        <option value="all">All jurisdictions</option>
        {AUSTRALIAN_JURISDICTIONS.map((j) => (
          <option key={j.value} value={j.value}>
            {j.label}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="filter-source-type">
        Source type
      </label>
      <select
        id="filter-source-type"
        className={selectClass}
        value={filters.sourceType}
        onChange={(e) => set("sourceType", e.target.value as DocumentFilterState["sourceType"])}
      >
        <option value="all">All source types</option>
        {DOCUMENT_SOURCE_TYPES.map((type) => (
          <option key={type} value={type}>
            {type.replace(/_/g, " ")}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="filter-processing">
        Processing status
      </label>
      <select
        id="filter-processing"
        className={selectClass}
        value={filters.processingStatus}
        onChange={(e) => set("processingStatus", e.target.value as DocumentFilterState["processingStatus"])}
      >
        <option value="all">All processing states</option>
        {DOCUMENT_PROCESSING_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status.replace(/_/g, " ")}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="filter-ai-usage">
        AI usage
      </label>
      <select
        id="filter-ai-usage"
        className={selectClass}
        value={filters.aiUsage}
        onChange={(e) => set("aiUsage", e.target.value as DocumentFilterState["aiUsage"])}
      >
        <option value="all">AI use: any</option>
        <option value="allowed">AI use allowed</option>
        <option value="not_allowed">AI use not allowed</option>
      </select>

      <label className="sr-only" htmlFor="filter-legal-review">
        Legal review
      </label>
      <select
        id="filter-legal-review"
        className={selectClass}
        value={filters.legalReview}
        onChange={(e) => set("legalReview", e.target.value as DocumentFilterState["legalReview"])}
      >
        <option value="all">Legal review: any</option>
        <option value="complete">Legal review complete</option>
        <option value="incomplete">Needs legal review</option>
      </select>

      <label className="sr-only" htmlFor="filter-review-due">
        Review due
      </label>
      <select
        id="filter-review-due"
        className={selectClass}
        value={filters.reviewDue}
        onChange={(e) => set("reviewDue", e.target.value as DocumentFilterState["reviewDue"])}
      >
        <option value="all">Review date: any</option>
        <option value="overdue">Overdue for review</option>
      </select>

      <button
        type="button"
        onClick={() => onChange(DEFAULT_DOCUMENT_FILTERS)}
        disabled={!isDocumentFilterActive(filters)}
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
