"use client";

import { use } from "react";

import { IncidentTypeForm } from "@/components/taxonomy/incident-types/incident-type-form";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useTaxonomyRecord } from "@/hooks/use-taxonomy-record";

export default function EditIncidentTypePage({ params }: { params: Promise<{ incidentTypeId: string }> }) {
  const { incidentTypeId } = use(params);
  const record = useTaxonomyRecord((repo) => repo.incidentTypes, incidentTypeId);

  if (record === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (record === null) {
    return <EmptyState title="Incident type not found" description="This record doesn't exist locally, or it was removed." />;
  }

  return (
    <>
      <PageHeader title={`Edit "${record.name}"`} description="Changes are only saved once you choose Save as draft, Mark ready for review, or Publish." />
      <IncidentTypeForm mode="edit" initialRecord={record} />
    </>
  );
}
