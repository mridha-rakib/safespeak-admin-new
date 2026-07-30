"use client";

import { use } from "react";

import { MicrocardForm } from "@/components/microcards/microcard-form";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useCrudRecord } from "@/hooks/use-crud-record";

export default function EditMicrocardPage({ params }: { params: Promise<{ microcardId: string }> }) {
  const { microcardId } = use(params);
  const record = useCrudRecord((repo) => repo.microcards, microcardId);

  if (record === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (record === null) {
    return <EmptyState title="Microcard not found" description="This record doesn't exist locally, or it was removed." />;
  }

  return (
    <>
      <PageHeader title={`Edit "${record.title}"`} description="Changes are only saved once you choose Save as draft, Mark ready for review, or Publish." />
      <MicrocardForm initialRecord={record} />
    </>
  );
}
