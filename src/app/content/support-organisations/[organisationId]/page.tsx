"use client";

import type { Route } from "next";
import Link from "next/link";
import { use, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { SupportOrganisationPreview } from "@/components/support-organisations/support-organisation-preview";
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
import { ContentStatusBadge, VerificationBadge } from "@/components/ui/status-badge";
import { useContentUsage } from "@/hooks/use-content-usage";
import { useCrudList } from "@/hooks/use-crud-list";
import { useCrudRecord } from "@/hooks/use-crud-record";
import { useEntityAuditEvents } from "@/hooks/use-entity-audit-events";
import { useTaxonomyDataBundle } from "@/hooks/use-taxonomy-data-bundle";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import { ORGANISATION_TYPE_LABEL } from "@/lib/models/organisation-type";
import type { SupportOrganisation } from "@/lib/models/support-organisation";
import { getSupportOrganisationBlockers } from "@/lib/support-directory/support-organisation-eligibility";

export default function SupportOrganisationDetailPage({ params }: { params: Promise<{ organisationId: string }> }) {
  const { organisationId } = use(params);
  const { repository } = useAdminRepository();
  const [record, setRecord] = useState<SupportOrganisation | null | undefined>(undefined);
  const liveRecord = useCrudRecord((repo) => repo.supportOrganisations, organisationId);
  const usage = useContentUsage((repo) => repo.supportOrganisations, organisationId);
  const auditEvents = useEntityAuditEvents("support_organisation", organisationId);
  const dataBundle = useTaxonomyDataBundle();
  const allProfessionals = useCrudList((repo) => repo.supportProfessionals) ?? [];

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
        title="Organisation not found"
        description="This record doesn't exist locally, or it was removed."
        action={
          <Link href="/content/support-organisations" className={buttonVariants({ variant: "outline" })}>
            Back to Support Organisations
          </Link>
        }
      />
    );
  }

  const blockers = dataBundle ? getSupportOrganisationBlockers(current, dataBundle) : ["Loading related records…"];
  const relatedProfessionals = allProfessionals.filter((p) => p.organisationId === current.id);

  return (
    <>
      <PageHeader
        title={current.name}
        description={current.shortDescription}
        actions={
          <Link href={`/content/support-organisations/${current.id}/edit` as Route} className={buttonVariants({ variant: "outline" })}>
            Edit
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <ContentStatusBadge status={current.status} />
        {current.isDemo ? <Badge tone="neutral">Demo</Badge> : null}
        <VerificationBadge status={current.verificationStatus} />
        <Badge tone="primary">Used by {usage?.totalCount ?? "…"} record(s)</Badge>
      </div>

      {repository ? (
        <PublishableStatusActions
          record={current}
          label={current.name}
          repository={repository.supportOrganisations}
          blockers={blockers}
          baseRoute="/content/support-organisations"
          onChanged={setRecord}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organisation information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-semibold text-foreground">Type: </span>
              {current.organisationType ? ORGANISATION_TYPE_LABEL[current.organisationType] : "Not set"}
            </p>
            <p>
              <span className="font-semibold text-foreground">Jurisdiction: </span>
              {current.australiaWide ? "Australia-wide" : current.jurisdictions.map(jurisdictionLabel).join(", ") || "Not set"}
            </p>
            <p>
              <span className="font-semibold text-foreground">Review due: </span>
              {current.reviewDueDate ?? "Not set"}
            </p>
            <p>
              <span className="font-semibold text-foreground">Emergency service: </span>
              {current.emergencyService ? "Yes" : "No"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-semibold text-foreground">Status: </span>
              <VerificationBadge status={current.verificationStatus} />
            </p>
            <p>
              <span className="font-semibold text-foreground">Verified date: </span>
              {current.verifiedDate ?? "Not set"}
            </p>
            <p>
              <span className="font-semibold text-foreground">Review / expiry date: </span>
              {current.verificationExpiryDate ?? "Not set"}
            </p>
            <p className="text-xs text-muted-foreground">
              Local administrative verification only — never a government, legal, or identity verification.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">User-facing preview</p>
        <SupportOrganisationPreview record={current} />
      </div>

      {relatedProfessionals.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Related professionals</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {relatedProfessionals.map((professional) => (
                <li key={professional.id}>
                  <Link href={`/content/advocates-counsellors/${professional.id}` as Route} className="text-primary hover:underline">
                    {professional.fullName}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">({professional.professionalType.replace(/_/g, " ")})</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Where this is used</CardTitle>
        </CardHeader>
        <CardContent>{usage ? <UsageSummaryView usage={usage} /> : <Skeleton className="h-16 w-full" />}</CardContent>
      </Card>

      <section aria-labelledby="organisation-audit-heading" className="space-y-3">
        <h2 id="organisation-audit-heading" className="text-lg font-semibold text-foreground">
          Audit activity
        </h2>
        <DataTable
          caption={`Audit activity for ${current.name}`}
          columns={auditEventColumns}
          data={auditEvents}
          searchPlaceholder="Search audit activity..."
          emptyTitle="No activity recorded yet"
          pageSizeStorageKey="safespeak-admin:support-organisation-audit:page-size"
        />
      </section>
    </>
  );
}
