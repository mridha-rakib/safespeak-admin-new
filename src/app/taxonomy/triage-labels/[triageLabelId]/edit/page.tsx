"use client";

import { use } from "react";

import { TriageLabelForm } from "@/components/taxonomy/triage-labels/triage-label-form";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useTaxonomyRecord } from "@/hooks/use-taxonomy-record";

export default function EditTriageLabelPage({ params }: { params: Promise<{ triageLabelId: string }> }) {
  const { triageLabelId } = use(params);
  const record = useTaxonomyRecord((repo) => repo.triageLabels, triageLabelId);

  if (record === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (record === null) {
    return <EmptyState title="Triage label not found" description="This record doesn't exist locally, or it was removed." />;
  }

  return (
    <>
      <PageHeader title={`Edit "${record.name}"`} description="Changes are only saved once you choose Save as draft, Mark ready for review, or Publish." />
      <TriageLabelForm mode="edit" initialRecord={record} />
    </>
  );
}
