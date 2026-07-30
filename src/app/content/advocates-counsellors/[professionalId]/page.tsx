"use client";

import type { Route } from "next";
import Link from "next/link";
import { use, useState } from "react";

import { PROFESSIONAL_TYPE_LABEL } from "@/components/advocates-counsellors/columns";
import { ProfessionalPreview } from "@/components/advocates-counsellors/professional-preview";
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
import { ContentStatusBadge, VerificationBadge } from "@/components/ui/status-badge";
import { useContentUsage } from "@/hooks/use-content-usage";
import { useCrudList } from "@/hooks/use-crud-list";
import { useCrudRecord } from "@/hooks/use-crud-record";
import { useEntityAuditEvents } from "@/hooks/use-entity-audit-events";
import { useTaxonomyDataBundle } from "@/hooks/use-taxonomy-data-bundle";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import type { SupportProfessional } from "@/lib/models/support-professional";
import { resolveSingularRelationshipId } from "@/lib/content/relationship-ids";
import { getProfessionalBlockers } from "@/lib/support-directory/professional-eligibility";

export default function ProfessionalDetailPage({ params }: { params: Promise<{ professionalId: string }> }) {
  const { professionalId } = use(params);
  const { repository } = useAdminRepository();
  const [record, setRecord] = useState<SupportProfessional | null | undefined>(undefined);
  const liveRecord = useCrudRecord((repo) => repo.supportProfessionals, professionalId);
  const usage = useContentUsage((repo) => repo.supportProfessionals, professionalId);
  const auditEvents = useEntityAuditEvents("support_professional", professionalId);
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
        title="Profile not found"
        description="This record doesn't exist locally, or it was removed."
        action={
          <Link href="/content/advocates-counsellors" className={buttonVariants({ variant: "outline" })}>
            Back to Advocates & Counsellors
          </Link>
        }
      />
    );
  }

  const eligibilityContext = dataBundle
    ? { resourceCategories: dataBundle.resourceCategories, supportOrganisations: dataBundle.supportOrganisations }
    : undefined;
  const blockers = eligibilityContext ? getProfessionalBlockers(current, eligibilityContext) : ["Loading related records…"];
  const { record: organisation, isDangling: hasDanglingOrganisation } = resolveSingularRelationshipId(current.organisationId, organisations);

  return (
    <>
      <PageHeader
        title={current.displayName?.trim() || current.fullName}
        description={current.shortIntroduction}
        actions={
          <Link href={`/content/advocates-counsellors/${current.id}/edit` as Route} className={buttonVariants({ variant: "outline" })}>
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
          label={current.fullName}
          repository={repository.supportProfessionals}
          blockers={blockers}
          baseRoute="/content/advocates-counsellors"
          onChanged={setRecord}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-semibold text-foreground">Type: </span>
              {PROFESSIONAL_TYPE_LABEL[current.professionalType]}
            </p>
            <p>
              <span className="font-semibold text-foreground">Role: </span>
              {current.jobTitle ?? "Not set"}
            </p>
            <p>
              <span className="font-semibold text-foreground">Organisation: </span>
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
                "Independent"
              )}
            </p>
            <p>
              <span className="font-semibold text-foreground">Jurisdiction: </span>
              {current.australiaWide ? "Australia-wide" : current.jurisdictions.map(jurisdictionLabel).join(", ") || "Not set"}
            </p>
            <p>
              <span className="font-semibold text-foreground">Review due: </span>
              {current.nextReviewDate ?? "Not set"}
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
              <span className="font-semibold text-foreground">Expiry date: </span>
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
        <ProfessionalPreview record={current} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Where this is used</CardTitle>
        </CardHeader>
        <CardContent>{usage ? <UsageSummaryView usage={usage} /> : <Skeleton className="h-16 w-full" />}</CardContent>
      </Card>

      <section aria-labelledby="professional-audit-heading" className="space-y-3">
        <h2 id="professional-audit-heading" className="text-lg font-semibold text-foreground">
          Audit activity
        </h2>
        <DataTable
          caption={`Audit activity for ${current.fullName}`}
          columns={auditEventColumns}
          data={auditEvents}
          searchPlaceholder="Search audit activity..."
          emptyTitle="No activity recorded yet"
          pageSizeStorageKey="safespeak-admin:professional-audit:page-size"
        />
      </section>
    </>
  );
}
