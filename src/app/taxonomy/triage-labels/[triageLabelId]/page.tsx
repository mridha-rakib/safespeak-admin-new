"use client";

import type { Route } from "next";
import Link from "next/link";
import { use, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { useAdminRepository } from "@/components/providers/repository-provider";
import { ReplaceReferencesDialog } from "@/components/taxonomy/replace-references-dialog";
import { TaxonomyStatusActions } from "@/components/taxonomy/taxonomy-status-actions";
import { UsageSummaryView } from "@/components/taxonomy/usage-summary";
import { auditEventColumns } from "@/components/table/audit-event-columns";
import { DataTable } from "@/components/table/data-table";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentStatusBadge } from "@/components/ui/status-badge";
import { useCrudList } from "@/hooks/use-crud-list";
import { useEntityAuditEvents } from "@/hooks/use-entity-audit-events";
import { useTaxonomyRecord } from "@/hooks/use-taxonomy-record";
import { useTaxonomyUsage } from "@/hooks/use-taxonomy-usage";
import { getTriageLabelBlockers } from "@/lib/taxonomy/eligibility";
import type { TriageLabel } from "@/lib/models/triage-label";

const LABEL_GROUP_LABEL: Record<TriageLabel["labelGroup"], string> = {
  safety: "Safety",
  urgency: "Urgency",
  context_indicator: "Context indicator",
  bias_indicator: "Bias indicator",
  support_need: "Support need",
  accessibility_need: "Accessibility need",
  other: "Other",
};

export default function TriageLabelDetailPage({ params }: { params: Promise<{ triageLabelId: string }> }) {
  const { triageLabelId } = use(params);
  const { repository } = useAdminRepository();
  const [record, setRecord] = useState<TriageLabel | null | undefined>(undefined);
  const liveRecord = useTaxonomyRecord((repo) => repo.triageLabels, triageLabelId);
  const usage = useTaxonomyUsage((repo) => repo.triageLabels, triageLabelId);
  const auditEvents = useEntityAuditEvents("triage_label", triageLabelId);
  const existingAll = useCrudList((repo) => repo.triageLabels) ?? [];
  const [replaceOpen, setReplaceOpen] = useState(false);

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
        title="Triage label not found"
        description="This record doesn't exist locally, or it was removed."
        action={
          <Link href="/taxonomy/triage-labels" className={buttonVariants({ variant: "outline" })}>
            Back to Triage Labels
          </Link>
        }
      />
    );
  }

  const blockers = getTriageLabelBlockers(current, existingAll.filter((r) => r.id !== current.id));
  const candidates = existingAll.filter((r) => r.id !== current.id && r.status !== "archived");

  return (
    <>
      <PageHeader
        title={current.name}
        description={current.description}
        actions={
          <Link href={`/taxonomy/triage-labels/${current.id}/edit` as Route} className={buttonVariants({ variant: "outline" })}>
            Edit
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <ContentStatusBadge status={current.status} />
        {current.isDemo ? <Badge tone="neutral">Demo</Badge> : null}
        <Badge tone="primary">Used by {usage?.totalCount ?? "…"} record(s)</Badge>
      </div>

      {current.labelGroup === "bias_indicator" || current.labelGroup === "context_indicator" ? (
        <Alert tone="warning" title="Wording reminder">
          This label must always read as an indicator, not a confirmed hate crime, legal finding, diagnosis, or final
          decision.
        </Alert>
      ) : null}

      <TaxonomyStatusActions
        record={current}
        repository={repository!.triageLabels}
        blockers={blockers}
        onChanged={setRecord}
        onDeleted={() => {
          window.location.href = "/taxonomy/triage-labels";
        }}
      />

      {usage && usage.totalCount > 0 ? (
        <button
          type="button"
          onClick={() => setReplaceOpen(true)}
          className="self-start rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
        >
          Replace references
        </button>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Classification information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-semibold text-foreground">Stable key: </span>
              <code>{current.machineKey}</code>
            </p>
            <p>
              <span className="font-semibold text-foreground">Label group: </span>
              {LABEL_GROUP_LABEL[current.labelGroup]}
            </p>
            <p>
              <span className="font-semibold text-foreground">Display order: </span>
              {current.displayOrder}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Publishing information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-semibold text-foreground">Created: </span>
              {new Date(current.createdAt).toLocaleString()}
            </p>
            <p>
              <span className="font-semibold text-foreground">Updated: </span>
              {new Date(current.updatedAt).toLocaleString()}
            </p>
            <p>
              <span className="font-semibold text-foreground">Version: </span>
              {current.version}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Where this is used</CardTitle>
        </CardHeader>
        <CardContent>{usage ? <UsageSummaryView usage={usage} /> : <Skeleton className="h-16 w-full" />}</CardContent>
      </Card>

      <section aria-labelledby="triage-label-audit-heading" className="space-y-3">
        <h2 id="triage-label-audit-heading" className="text-lg font-semibold text-foreground">
          Audit activity
        </h2>
        <DataTable
          caption={`Audit activity for ${current.name}`}
          columns={auditEventColumns}
          data={auditEvents}
          searchPlaceholder="Search audit activity..."
          emptyTitle="No activity recorded yet"
          pageSizeStorageKey="safespeak-admin:triage-label-audit:page-size"
        />
      </section>

      {repository && usage ? (
        <ReplaceReferencesDialog
          open={replaceOpen}
          onOpenChange={setReplaceOpen}
          source={current}
          usage={usage}
          candidates={candidates}
          repository={repository.triageLabels}
        />
      ) : null}
    </>
  );
}
