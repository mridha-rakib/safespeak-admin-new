"use client";

import type { Route } from "next";
import Link from "next/link";
import { use, useState } from "react";

import { EnabledToggleButton } from "@/components/matching-rules/enabled-toggle-button";
import { TestMatchingPanel } from "@/components/matching-rules/test-matching-panel";
import { PageHeader } from "@/components/layout/page-header";
import { PublishableStatusActions } from "@/components/content/publishable-status-actions";
import { useAdminRepository } from "@/components/providers/repository-provider";
import { UsageSummaryView } from "@/components/taxonomy/usage-summary";
import { auditEventColumns } from "@/components/table/audit-event-columns";
import { DataTable } from "@/components/table/data-table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentStatusBadge } from "@/components/ui/status-badge";
import { useContentUsage } from "@/hooks/use-content-usage";
import { useCrudRecord } from "@/hooks/use-crud-record";
import { useEntityAuditEvents } from "@/hooks/use-entity-audit-events";
import { useTaxonomyDataBundle } from "@/hooks/use-taxonomy-data-bundle";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import { getMatchingRuleBlockers } from "@/lib/matching-rules/eligibility";
import { ASSISTANT_TOPIC_LABEL } from "@/lib/models/assistant-topic";
import { MATCHING_RULE_RECOMMENDATION_FIELDS, type MatchingRule } from "@/lib/models/matching-rule";

function idsToNames(ids: string[], records: { id: string; name?: string; title?: string; fullName?: string }[]): string {
  if (ids.length === 0) return "None";
  const byId = new Map(records.map((r) => [r.id, r.name ?? r.title ?? r.fullName ?? r.id]));
  return ids.map((id) => byId.get(id) ?? `${id} (missing)`).join(", ");
}

export default function MatchingRuleDetailPage({ params }: { params: Promise<{ matchingRuleId: string }> }) {
  const { matchingRuleId } = use(params);
  const { repository } = useAdminRepository();
  const [record, setRecord] = useState<MatchingRule | null | undefined>(undefined);
  const liveRecord = useCrudRecord((repo) => repo.matchingRules, matchingRuleId);
  const usage = useContentUsage((repo) => repo.matchingRules, matchingRuleId);
  const auditEvents = useEntityAuditEvents("matching_rule", matchingRuleId);
  const dataBundle = useTaxonomyDataBundle();

  const current = record ?? liveRecord;

  if (current === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (current === null) {
    return (
      <EmptyState
        title="Matching rule not found"
        description="This record doesn't exist locally, or it was removed."
        action={
          <Link href="/taxonomy/matching-rules" className={buttonVariants({ variant: "outline" })}>
            Back to Matching Rules
          </Link>
        }
      />
    );
  }

  const blockers = dataBundle ? getMatchingRuleBlockers(current, dataBundle) : ["Loading related records…"];
  const recommendationCount = MATCHING_RULE_RECOMMENDATION_FIELDS.reduce((total, field) => total + current[field].length, 0);

  return (
    <>
      <PageHeader
        title={current.name}
        description={current.description}
        actions={
          <Link href={`/taxonomy/matching-rules/${current.id}/edit` as Route} className={buttonVariants({ variant: "outline" })}>
            Edit
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <ContentStatusBadge status={current.status} />
        {current.enabled ? <Badge tone="success">Enabled</Badge> : <Badge tone="neutral">Disabled</Badge>}
        {current.isDemo ? <Badge tone="neutral">Demo</Badge> : null}
        <Badge tone="primary">Used by {usage?.totalCount ?? "…"} record(s)</Badge>
      </div>

      {repository ? (
        <div className="flex flex-wrap items-center gap-3">
          <PublishableStatusActions
            record={current}
            label={current.name}
            repository={repository.matchingRules}
            blockers={blockers}
            baseRoute="/taxonomy/matching-rules"
            onChanged={setRecord}
          />
          <EnabledToggleButton record={current} repository={repository} onChanged={setRecord} />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rule identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-semibold text-foreground">Machine key: </span>
              <code className="text-xs">{current.machineKey}</code>
            </p>
            <p>
              <span className="font-semibold text-foreground">Description: </span>
              {current.description ?? "Not set"}
            </p>
            <p>
              <span className="font-semibold text-foreground">Priority: </span>
              {current.priority} (lower number = higher precedence)
            </p>
            <p>
              <span className="font-semibold text-foreground">Enabled: </span>
              {current.enabled ? "Yes" : "No"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Governance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-semibold text-foreground">Review due: </span>
              {current.reviewDueDate ?? "Not set"}
            </p>
            <p>
              <span className="font-semibold text-foreground">Internal notes: </span>
              {current.internalNotes ?? "None"}
            </p>
            <p>
              <span className="font-semibold text-foreground">Created: </span>
              {new Date(current.createdAt).toLocaleString()}
            </p>
            <p>
              <span className="font-semibold text-foreground">Updated: </span>
              {new Date(current.updatedAt).toLocaleString()}
            </p>
            <p>
              <span className="font-semibold text-foreground">Published: </span>
              {current.publishedDate ? new Date(current.publishedDate).toLocaleString() : "Not yet published"}
            </p>
            <p>
              <span className="font-semibold text-foreground">Version: </span>
              {current.version}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Match conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-semibold text-foreground">Assistant topics: </span>
              {current.topicKeys.length === 0 ? "Any" : current.topicKeys.map((key) => ASSISTANT_TOPIC_LABEL[key]).join(", ")}
            </p>
            <p>
              <span className="font-semibold text-foreground">Incident types: </span>
              {current.incidentTypeIds.length === 0 ? "Any" : idsToNames(current.incidentTypeIds, dataBundle?.incidentTypes ?? [])}
            </p>
            <p>
              <span className="font-semibold text-foreground">Triage labels: </span>
              {current.triageLabelIds.length === 0 ? "Any" : idsToNames(current.triageLabelIds, dataBundle?.triageLabels ?? [])}
            </p>
            <p>
              <span className="font-semibold text-foreground">Resource categories: </span>
              {current.resourceCategoryIds.length === 0 ? "Any" : idsToNames(current.resourceCategoryIds, dataBundle?.resourceCategories ?? [])}
            </p>
            <p>
              <span className="font-semibold text-foreground">Jurisdictions: </span>
              {current.jurisdictions.length === 0 ? "Australia-wide" : current.jurisdictions.map((j) => jurisdictionLabel(j)).join(", ")}
            </p>
            <p>
              <span className="font-semibold text-foreground">Urgency levels: </span>
              {current.urgencyLevels.length === 0 ? "Any" : current.urgencyLevels.join(", ")}
            </p>
            <p>
              <span className="font-semibold text-foreground">Support needs: </span>
              {current.supportNeeds.length === 0 ? "Any" : current.supportNeeds.join(", ")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended content ({recommendationCount})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-semibold text-foreground">Microcards: </span>
              {idsToNames(current.microcardIds, dataBundle?.microcards ?? [])}
            </p>
            <p>
              <span className="font-semibold text-foreground">Rights &amp; legal information: </span>
              {idsToNames(current.rightsContentIds, dataBundle?.rightsContent ?? [])}
            </p>
            <p>
              <span className="font-semibold text-foreground">Support organisations: </span>
              {idsToNames(current.supportOrganisationIds, dataBundle?.supportOrganisations ?? [])}
            </p>
            <p>
              <span className="font-semibold text-foreground">Advocates &amp; counsellors: </span>
              {idsToNames(current.supportProfessionalIds, dataBundle?.supportProfessionals ?? [])}
            </p>
            <p>
              <span className="font-semibold text-foreground">Reporting destinations: </span>
              {idsToNames(current.reportingDestinationIds, dataBundle?.reportingDestinations ?? [])}
            </p>
            <p>
              <span className="font-semibold text-foreground">Legislation sources: </span>
              {idsToNames(current.legislationIds, dataBundle?.documents ?? [])}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Where this is used</CardTitle>
        </CardHeader>
        <CardContent>
          {usage ? (
            <UsageSummaryView usage={usage} />
          ) : (
            <Skeleton className="h-16 w-full" />
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Nothing currently references a Matching Rule by id — a rule only ever points outward at other content, never
            the other way around.
          </p>
        </CardContent>
      </Card>

      <TestMatchingPanel record={current} />

      <section aria-labelledby="matching-rule-audit-heading" className="space-y-3">
        <h2 id="matching-rule-audit-heading" className="text-lg font-semibold text-foreground">
          Audit activity
        </h2>
        <DataTable
          caption={`Audit activity for ${current.name}`}
          columns={auditEventColumns}
          data={auditEvents}
          searchPlaceholder="Search audit activity..."
          emptyTitle="No activity recorded yet"
          pageSizeStorageKey="safespeak-admin:matching-rule-audit:page-size"
        />
      </section>
    </>
  );
}
