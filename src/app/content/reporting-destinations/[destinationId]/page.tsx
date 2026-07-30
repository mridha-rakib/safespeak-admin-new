"use client";

import type { Route } from "next";
import Link from "next/link";
import { use, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { DestinationPreview } from "@/components/reporting-destinations/destination-preview";
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
import { useCrudList } from "@/hooks/use-crud-list";
import { useCrudRecord } from "@/hooks/use-crud-record";
import { useEntityAuditEvents } from "@/hooks/use-entity-audit-events";
import { useTaxonomyDataBundle } from "@/hooks/use-taxonomy-data-bundle";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import type { ReportingDestination } from "@/lib/models/reporting-destination";
import { DESTINATION_TYPE_LABEL, REPORTING_METHOD_LABEL, TRISTATE_LABEL } from "@/lib/models/reporting-destination-type";
import { resolveSingularRelationshipId } from "@/lib/content/relationship-ids";
import { getDestinationBlockers } from "@/lib/support-directory/destination-eligibility";

export default function DestinationDetailPage({ params }: { params: Promise<{ destinationId: string }> }) {
  const { destinationId } = use(params);
  const { repository } = useAdminRepository();
  const [record, setRecord] = useState<ReportingDestination | null | undefined>(undefined);
  const liveRecord = useCrudRecord((repo) => repo.reportingDestinations, destinationId);
  const usage = useContentUsage((repo) => repo.reportingDestinations, destinationId);
  const auditEvents = useEntityAuditEvents("reporting_destination", destinationId);
  const dataBundle = useTaxonomyDataBundle();
  const organisations = useCrudList((repo) => repo.supportOrganisations) ?? [];

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
        title="Destination not found"
        description="This record doesn't exist locally, or it was removed."
        action={
          <Link href="/content/reporting-destinations" className={buttonVariants({ variant: "outline" })}>
            Back to Reporting Destinations
          </Link>
        }
      />
    );
  }

  const eligibilityContext = dataBundle
    ? { resourceCategories: dataBundle.resourceCategories, supportOrganisations: dataBundle.supportOrganisations }
    : undefined;
  const blockers = eligibilityContext ? getDestinationBlockers(current, eligibilityContext) : ["Loading related records…"];
  const { record: organisation, isDangling: hasDanglingOrganisation } = resolveSingularRelationshipId(current.organisationId, organisations);

  return (
    <>
      <PageHeader
        title={current.name}
        description={current.description}
        actions={
          <Link href={`/content/reporting-destinations/${current.id}/edit` as Route} className={buttonVariants({ variant: "outline" })}>
            Edit
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <ContentStatusBadge status={current.status} />
        {current.isDemo ? <Badge tone="neutral">Demo</Badge> : null}
        <Badge tone="neutral">Anonymous reporting: {TRISTATE_LABEL[current.anonymousReporting]}</Badge>
        {current.emergencySuitability === "yes" ? <Badge tone="destructive">Emergency suitable</Badge> : null}
        <Badge tone="primary">Used by {usage?.totalCount ?? "…"} record(s)</Badge>
      </div>

      {repository ? (
        <PublishableStatusActions
          record={current}
          label={current.name}
          repository={repository.reportingDestinations}
          blockers={blockers}
          baseRoute="/content/reporting-destinations"
          onChanged={setRecord}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Destination information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-semibold text-foreground">Type: </span>
              {current.destinationType ? DESTINATION_TYPE_LABEL[current.destinationType] : "Not set"}
            </p>
            <p>
              <span className="font-semibold text-foreground">Jurisdiction: </span>
              {current.australiaWide ? "Australia-wide" : current.jurisdictions.map(jurisdictionLabel).join(", ") || "Not set"}
            </p>
            <p>
              <span className="font-semibold text-foreground">Related organisation: </span>
              {current.organisationId ? (
                hasDanglingOrganisation ? (
                  <span className="text-warning">The linked organisation no longer exists.</span>
                ) : organisation ? (
                  <Link href={`/content/support-organisations/${organisation.id}` as Route} className="text-primary hover:underline">
                    {organisation.name}
                  </Link>
                ) : (
                  "Loading…"
                )
              ) : (
                "None"
              )}
            </p>
            <p>
              <span className="font-semibold text-foreground">Review due: </span>
              {current.reviewDueDate ?? "Not set"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reporting methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{current.reportingMethods.map((m) => REPORTING_METHOD_LABEL[m]).join(", ") || "None set"}</p>
            <p>
              <span className="font-semibold text-foreground">Anonymous reporting: </span>
              {TRISTATE_LABEL[current.anonymousReporting]}
            </p>
            <p>
              <span className="font-semibold text-foreground">Emergency suitability: </span>
              {TRISTATE_LABEL[current.emergencySuitability]}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">User-facing preview</p>
        <DestinationPreview record={current} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Where this is used</CardTitle>
        </CardHeader>
        <CardContent>{usage ? <UsageSummaryView usage={usage} /> : <Skeleton className="h-16 w-full" />}</CardContent>
      </Card>

      <section aria-labelledby="destination-audit-heading" className="space-y-3">
        <h2 id="destination-audit-heading" className="text-lg font-semibold text-foreground">
          Audit activity
        </h2>
        <DataTable
          caption={`Audit activity for ${current.name}`}
          columns={auditEventColumns}
          data={auditEvents}
          searchPlaceholder="Search audit activity..."
          emptyTitle="No activity recorded yet"
          pageSizeStorageKey="safespeak-admin:destination-audit:page-size"
        />
      </section>
    </>
  );
}
