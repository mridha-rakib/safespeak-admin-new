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
import { getResourceCategoryBlockers } from "@/lib/taxonomy/eligibility";
import type { ResourceCategory } from "@/lib/models/resource-category";
import { RESOURCE_CATEGORY_ACCENT_LABELS, RESOURCE_CATEGORY_ICON_COMPONENTS, RESOURCE_CATEGORY_ICON_LABELS } from "@/lib/taxonomy/resource-icons";

export default function ResourceCategoryDetailPage({ params }: { params: Promise<{ resourceCategoryId: string }> }) {
  const { resourceCategoryId } = use(params);
  const { repository } = useAdminRepository();
  const [record, setRecord] = useState<ResourceCategory | null | undefined>(undefined);
  const liveRecord = useTaxonomyRecord((repo) => repo.resourceCategories, resourceCategoryId);
  const usage = useTaxonomyUsage((repo) => repo.resourceCategories, resourceCategoryId);
  const auditEvents = useEntityAuditEvents("resource_category", resourceCategoryId);
  const existingAll = useCrudList((repo) => repo.resourceCategories) ?? [];
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
        title="Resource category not found"
        description="This record doesn't exist locally, or it was removed."
        action={
          <Link href="/taxonomy/resource-categories" className={buttonVariants({ variant: "outline" })}>
            Back to Resource Categories
          </Link>
        }
      />
    );
  }

  const blockers = getResourceCategoryBlockers(current, existingAll.filter((r) => r.id !== current.id));
  const candidates = existingAll.filter((r) => r.id !== current.id && r.status !== "archived");
  const IconComponent = current.iconKey ? RESOURCE_CATEGORY_ICON_COMPONENTS[current.iconKey] : null;

  return (
    <>
      <PageHeader
        title={current.name}
        description={current.description}
        actions={
          <Link href={`/taxonomy/resource-categories/${current.id}/edit` as Route} className={buttonVariants({ variant: "outline" })}>
            Edit
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <ContentStatusBadge status={current.status} />
        {current.isDemo ? <Badge tone="neutral">Demo</Badge> : null}
        <Badge tone="primary">Used by {usage?.totalCount ?? "…"} record(s)</Badge>
      </div>

      <TaxonomyStatusActions
        record={current}
        repository={repository!.resourceCategories}
        blockers={blockers}
        onChanged={setRecord}
        onDeleted={() => {
          window.location.href = "/taxonomy/resource-categories";
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
              <span className="font-semibold text-foreground">Display order: </span>
              {current.displayOrder}
            </p>
            <p className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Icon: </span>
              {IconComponent ? (
                <span className="inline-flex items-center gap-1.5">
                  <IconComponent size={16} aria-hidden="true" />
                  {current.iconKey ? RESOURCE_CATEGORY_ICON_LABELS[current.iconKey] : null}
                </span>
              ) : (
                "None"
              )}
            </p>
            <p>
              <span className="font-semibold text-foreground">Accent colour: </span>
              {current.accentToken ? RESOURCE_CATEGORY_ACCENT_LABELS[current.accentToken] : "None"}
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

      <section aria-labelledby="resource-category-audit-heading" className="space-y-3">
        <h2 id="resource-category-audit-heading" className="text-lg font-semibold text-foreground">
          Audit activity
        </h2>
        <DataTable
          caption={`Audit activity for ${current.name}`}
          columns={auditEventColumns}
          data={auditEvents}
          searchPlaceholder="Search audit activity..."
          emptyTitle="No activity recorded yet"
          pageSizeStorageKey="safespeak-admin:resource-category-audit:page-size"
        />
      </section>

      {repository && usage ? (
        <ReplaceReferencesDialog
          open={replaceOpen}
          onOpenChange={setReplaceOpen}
          source={current}
          usage={usage}
          candidates={candidates}
          repository={repository.resourceCategories}
        />
      ) : null}
    </>
  );
}
