"use client";

import { IconPlus } from "@tabler/icons-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";

import { buildMatchingRuleColumns } from "@/components/matching-rules/columns";
import { PageHeader } from "@/components/layout/page-header";
import { useAdminRepository } from "@/components/providers/repository-provider";
import { DataTable } from "@/components/table/data-table";
import { TaxonomyFiltersPanel } from "@/components/taxonomy/taxonomy-filters-panel";
import { buttonVariants } from "@/components/ui/button";
import { useCrudList } from "@/hooks/use-crud-list";
import { useTaxonomyDataBundle } from "@/hooks/use-taxonomy-data-bundle";
import { ASSISTANT_TOPIC_KEYS, ASSISTANT_TOPIC_LABEL, type AssistantTopicKey } from "@/lib/models/assistant-topic";
import type { MatchingRule } from "@/lib/models/matching-rule";
import { applyTaxonomyListFilters, DEFAULT_TAXONOMY_LIST_FILTERS, type TaxonomyListFilters } from "@/lib/taxonomy/list-filters";

type EnabledFilter = "all" | "enabled_only" | "disabled_only";
type TopicFilter = "all" | AssistantTopicKey;

const inlineSelectClass = "h-9 rounded-full border border-input bg-card px-3 text-xs text-foreground focus-visible:outline-none";

export default function MatchingRulesPage() {
  const { repository } = useAdminRepository();
  const records = useCrudList((repo) => repo.matchingRules);
  // TaxonomyDataBundle is a strict superset of MatchingRuleEligibilityContext
  // (see lib/matching-rules/eligibility.ts), so it can be passed directly to
  // buildMatchingRuleColumns wherever a blocker check is needed — same
  // pattern content/microcards/page.tsx already uses for getMicrocardBlockers.
  const dataBundle = useTaxonomyDataBundle();
  const [filters, setFilters] = useState<TaxonomyListFilters>(DEFAULT_TAXONOMY_LIST_FILTERS);
  const [enabledFilter, setEnabledFilter] = useState<EnabledFilter>("all");
  const [topicFilter, setTopicFilter] = useState<TopicFilter>("all");

  const filtered = useMemo(() => {
    if (!records) return records;
    let next: MatchingRule[] = applyTaxonomyListFilters(records, filters);
    if (enabledFilter === "enabled_only") next = next.filter((record) => record.enabled);
    if (enabledFilter === "disabled_only") next = next.filter((record) => !record.enabled);
    if (topicFilter !== "all") {
      // Empty topicKeys is a wildcard (matches every topic) — see the
      // matching-rule model's own doc comment — so it stays visible under
      // any specific topic filter, not just "all".
      next = next.filter((record) => record.topicKeys.length === 0 || record.topicKeys.includes(topicFilter));
    }
    return next;
  }, [records, filters, enabledFilter, topicFilter]);

  const columns = useMemo(
    () => (repository ? buildMatchingRuleColumns(repository.matchingRules, repository, dataBundle) : []),
    [repository, dataBundle]
  );

  return (
    <>
      <PageHeader
        title="Matching Rules"
        description="How incident context (assistant topic, incident type, triage labels, jurisdiction, urgency, support needs) connects to the content and support that should surface on the frontend Triage page."
        actions={
          <Link href={"/taxonomy/matching-rules/new" as Route} className={buttonVariants()}>
            <IconPlus size={16} aria-hidden="true" />
            Add matching rule
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <TaxonomyFiltersPanel filters={filters} onChange={setFilters} />

        <label className="sr-only" htmlFor="matching-rule-filter-enabled">
          Enabled
        </label>
        <select
          id="matching-rule-filter-enabled"
          className={inlineSelectClass}
          value={enabledFilter}
          onChange={(event) => setEnabledFilter(event.target.value as EnabledFilter)}
        >
          <option value="all">Enabled: any</option>
          <option value="enabled_only">Enabled only</option>
          <option value="disabled_only">Disabled only</option>
        </select>

        <label className="sr-only" htmlFor="matching-rule-filter-topic">
          Assistant topic
        </label>
        <select
          id="matching-rule-filter-topic"
          className={inlineSelectClass}
          value={topicFilter}
          onChange={(event) => setTopicFilter(event.target.value as TopicFilter)}
        >
          <option value="all">Topic: any</option>
          {ASSISTANT_TOPIC_KEYS.map((key) => (
            <option key={key} value={key}>
              {ASSISTANT_TOPIC_LABEL[key]}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        caption="Matching Rules"
        columns={columns}
        data={filtered}
        searchPlaceholder="Search matching rules..."
        emptyTitle={records && records.length > 0 ? "No matching rules match the current filters" : "No matching rules yet"}
        emptyDescription={records && records.length > 0 ? "Try clearing filters." : "Choose Add matching rule to create one."}
        pageSizeStorageKey="safespeak-admin:matching-rules:page-size"
      />
    </>
  );
}
