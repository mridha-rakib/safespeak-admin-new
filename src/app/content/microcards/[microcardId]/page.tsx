"use client";

import type { Route } from "next";
import Link from "next/link";
import { use, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { MicrocardPreview } from "@/components/microcards/microcard-preview";
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
import { getMicrocardBlockers } from "@/lib/microcards/eligibility";
import { CONTENT_PRIORITY_LABEL } from "@/lib/models/content-common";
import type { Microcard } from "@/lib/models/microcard";
import { MICROCARD_CTA_TYPE_LABEL } from "@/lib/models/microcard-cta";

export default function MicrocardDetailPage({ params }: { params: Promise<{ microcardId: string }> }) {
  const { microcardId } = use(params);
  const { repository } = useAdminRepository();
  const [record, setRecord] = useState<Microcard | null | undefined>(undefined);
  const liveRecord = useCrudRecord((repo) => repo.microcards, microcardId);
  const usage = useContentUsage((repo) => repo.microcards, microcardId);
  const auditEvents = useEntityAuditEvents("microcard", microcardId);
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
        title="Microcard not found"
        description="This record doesn't exist locally, or it was removed."
        action={
          <Link href="/content/microcards" className={buttonVariants({ variant: "outline" })}>
            Back to Microcards
          </Link>
        }
      />
    );
  }

  const blockers = dataBundle ? getMicrocardBlockers(current, dataBundle) : ["Loading related records…"];

  return (
    <>
      <PageHeader
        title={current.title}
        description={current.summary}
        actions={
          <Link href={`/content/microcards/${current.id}/edit` as Route} className={buttonVariants({ variant: "outline" })}>
            Edit
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <ContentStatusBadge status={current.status} />
        {current.isDemo ? <Badge tone="neutral">Demo</Badge> : null}
        <Badge tone="primary">Used by {usage?.totalCount ?? "…"} record(s)</Badge>
      </div>

      {repository ? (
        <PublishableStatusActions
          record={current}
          label={current.title}
          repository={repository.microcards}
          blockers={blockers}
          baseRoute="/content/microcards"
          onChanged={setRecord}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Classification information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-semibold text-foreground">Card type: </span>
              {current.cardType ? current.cardType.replace(/_/g, " ") : "Not set"}
            </p>
            <p>
              <span className="font-semibold text-foreground">Jurisdiction: </span>
              {jurisdictionLabel(current.jurisdiction)}
            </p>
            <p>
              <span className="font-semibold text-foreground">Priority: </span>
              {CONTENT_PRIORITY_LABEL[current.priority]}
            </p>
            <p>
              <span className="font-semibold text-foreground">Display order: </span>
              {current.displayOrder}
            </p>
            <p>
              <span className="font-semibold text-foreground">Review due: </span>
              {current.reviewDueDate ?? "Not set"}
            </p>
            <p>
              <span className="font-semibold text-foreground">Call to action: </span>
              {MICROCARD_CTA_TYPE_LABEL[current.cta.type]}
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
              <span className="font-semibold text-foreground">Published: </span>
              {current.publishedDate ? new Date(current.publishedDate).toLocaleString() : "Not yet published"}
            </p>
            <p>
              <span className="font-semibold text-foreground">Version: </span>
              {current.version}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">User-facing preview</p>
        <MicrocardPreview record={current} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Where this is used</CardTitle>
        </CardHeader>
        <CardContent>{usage ? <UsageSummaryView usage={usage} /> : <Skeleton className="h-16 w-full" />}</CardContent>
      </Card>

      <section aria-labelledby="microcard-audit-heading" className="space-y-3">
        <h2 id="microcard-audit-heading" className="text-lg font-semibold text-foreground">
          Audit activity
        </h2>
        <DataTable
          caption={`Audit activity for ${current.title}`}
          columns={auditEventColumns}
          data={auditEvents}
          searchPlaceholder="Search audit activity..."
          emptyTitle="No activity recorded yet"
          pageSizeStorageKey="safespeak-admin:microcard-audit:page-size"
        />
      </section>
    </>
  );
}
