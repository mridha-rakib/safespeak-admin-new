"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Route } from "next";
import Link from "next/link";

import { EnabledToggleButton } from "@/components/matching-rules/enabled-toggle-button";
import { PublishableRowActions } from "@/components/content/publishable-row-actions";
import { Badge } from "@/components/ui/badge";
import { ContentStatusBadge } from "@/components/ui/status-badge";
import { getReviewDueState, REVIEW_DUE_STATE_LABEL } from "@/lib/content/review-due";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import { ASSISTANT_TOPIC_LABEL } from "@/lib/models/assistant-topic";
import { MATCHING_RULE_RECOMMENDATION_FIELDS, type MatchingRule } from "@/lib/models/matching-rule";
import { getMatchingRuleBlockers, type MatchingRuleEligibilityContext } from "@/lib/matching-rules/eligibility";
import type { AdminContentRepository, PublishableContentRepository } from "@/lib/repositories/admin-content-repository";

const REVIEW_DUE_TONE: Record<ReturnType<typeof getReviewDueState>, "neutral" | "warning" | "destructive"> = {
  current: "neutral",
  due_soon: "warning",
  overdue: "destructive",
  none: "neutral",
};

function describeList(values: string[], allWildcardLabel: string): string {
  if (values.length === 0) return allWildcardLabel;
  if (values.length <= 2) return values.join(", ");
  return `${values.slice(0, 2).join(", ")} +${values.length - 2} more`;
}

function recommendationCount(record: MatchingRule): number {
  return MATCHING_RULE_RECOMMENDATION_FIELDS.reduce((total, field) => total + record[field].length, 0);
}

export function buildMatchingRuleColumns(
  repository: PublishableContentRepository<MatchingRule>,
  adminRepository: AdminContentRepository | null,
  eligibilityContext: MatchingRuleEligibilityContext | undefined
): ColumnDef<MatchingRule, unknown>[] {
  return [
    {
      accessorKey: "name",
      header: "Rule name",
      cell: ({ row }) => (
        <Link
          href={`/taxonomy/matching-rules/${row.original.id}` as Route}
          className="font-medium text-foreground hover:text-primary hover:underline"
          // Same concurrent-prefetch-storm rationale as components/microcards/columns.tsx.
          prefetch={false}
        >
          {row.original.name}
        </Link>
      ),
    },
    { accessorKey: "machineKey", header: "Machine key", cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code> },
    { accessorKey: "priority", header: "Priority" },
    {
      accessorKey: "enabled",
      header: "Enabled",
      cell: ({ getValue }) => (getValue<boolean>() ? <Badge tone="success">Enabled</Badge> : <Badge tone="neutral">Disabled</Badge>),
    },
    {
      id: "topics",
      header: "Topics",
      cell: ({ row }) => describeList(row.original.topicKeys.map((key) => ASSISTANT_TOPIC_LABEL[key]), "Any topic"),
    },
    {
      id: "incidentTypes",
      header: "Incident types",
      cell: ({ row }) => (row.original.incidentTypeIds.length === 0 ? "Any" : String(row.original.incidentTypeIds.length)),
    },
    {
      id: "triageLabels",
      header: "Triage labels",
      cell: ({ row }) => (row.original.triageLabelIds.length === 0 ? "Any" : String(row.original.triageLabelIds.length)),
    },
    {
      id: "jurisdictions",
      header: "Jurisdictions",
      cell: ({ row }) => describeList(row.original.jurisdictions.map((j) => jurisdictionLabel(j)), "Australia-wide"),
    },
    {
      id: "recommendationCount",
      header: "Recommendations",
      cell: ({ row }) => recommendationCount(row.original),
    },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <ContentStatusBadge status={getValue<MatchingRule["status"]>()} /> },
    {
      id: "reviewDue",
      header: "Review due",
      cell: ({ row }) => {
        const state = getReviewDueState(row.original.reviewDueDate);
        return <Badge tone={REVIEW_DUE_TONE[state]}>{REVIEW_DUE_STATE_LABEL[state]}</Badge>;
      },
    },
    { accessorKey: "updatedAt", header: "Updated", cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString() },
    { accessorKey: "isDemo", header: "Demo", cell: ({ getValue }) => (getValue<boolean>() ? <Badge tone="neutral">Demo</Badge> : null) },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-2">
          {adminRepository ? (
            <EnabledToggleButton record={row.original} repository={adminRepository} />
          ) : null}
          <PublishableRowActions
            record={row.original}
            label={row.original.name}
            repository={repository}
            baseRoute="/taxonomy/matching-rules"
            canPublish={eligibilityContext ? getMatchingRuleBlockers(row.original, eligibilityContext).length === 0 : false}
          />
        </div>
      ),
    },
  ];
}
