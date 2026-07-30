"use client";

import type { Route } from "next";
import Link from "next/link";
import { use, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { RightsContentPreview } from "@/components/rights-content/rights-content-preview";
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
import { CONTENT_PRIORITY_LABEL } from "@/lib/models/content-common";
import type { RightsContent } from "@/lib/models/rights-content";
import { contentTypeRequiresLegalSource, getRightsContentBlockers } from "@/lib/rights-content/eligibility";

export default function RightsContentDetailPage({ params }: { params: Promise<{ rightsContentId: string }> }) {
  const { rightsContentId } = use(params);
  const { repository } = useAdminRepository();
  const [record, setRecord] = useState<RightsContent | null | undefined>(undefined);
  const liveRecord = useCrudRecord((repo) => repo.rightsContent, rightsContentId);
  const usage = useContentUsage((repo) => repo.rightsContent, rightsContentId);
  const auditEvents = useEntityAuditEvents("rights_content", rightsContentId);
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
        title="Record not found"
        description="This record doesn't exist locally, or it was removed."
        action={
          <Link href="/content/rights-legal-information" className={buttonVariants({ variant: "outline" })}>
            Back to Rights & Legal Information
          </Link>
        }
      />
    );
  }

  const blockers = dataBundle ? getRightsContentBlockers(current, dataBundle) : ["Loading related records…"];
  const requiresDisclaimer = contentTypeRequiresLegalSource(current.contentType);

  return (
    <>
      <PageHeader
        title={current.title}
        description={current.summary}
        actions={
          <Link href={`/content/rights-legal-information/${current.id}/edit` as Route} className={buttonVariants({ variant: "outline" })}>
            Edit
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <ContentStatusBadge status={current.status} />
        {current.isDemo ? <Badge tone="neutral">Demo</Badge> : null}
        {requiresDisclaimer ? <Badge tone="warning">Legal claim</Badge> : <Badge tone="neutral">Informational</Badge>}
        <Badge tone="primary">Used by {usage?.totalCount ?? "…"} record(s)</Badge>
      </div>

      {repository ? (
        <PublishableStatusActions
          record={current}
          label={current.title}
          repository={repository.rightsContent}
          blockers={blockers}
          baseRoute="/content/rights-legal-information"
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
              <span className="font-semibold text-foreground">Content type: </span>
              {current.contentType ? current.contentType.replace(/_/g, " ") : "Not set"}
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
              <span className="font-semibold text-foreground">Effective from: </span>
              {current.effectiveFromDate ?? "Not set"}
            </p>
            <p>
              <span className="font-semibold text-foreground">Review due: </span>
              {current.reviewDueDate ?? "Not set"}
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
        <RightsContentPreview record={current} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Where this is used</CardTitle>
        </CardHeader>
        <CardContent>{usage ? <UsageSummaryView usage={usage} /> : <Skeleton className="h-16 w-full" />}</CardContent>
      </Card>

      <section aria-labelledby="rights-content-audit-heading" className="space-y-3">
        <h2 id="rights-content-audit-heading" className="text-lg font-semibold text-foreground">
          Audit activity
        </h2>
        <DataTable
          caption={`Audit activity for ${current.title}`}
          columns={auditEventColumns}
          data={auditEvents}
          searchPlaceholder="Search audit activity..."
          emptyTitle="No activity recorded yet"
          pageSizeStorageKey="safespeak-admin:rights-content-audit:page-size"
        />
      </section>
    </>
  );
}
