"use client";

import { use } from "react";

import { RightsContentForm } from "@/components/rights-content/rights-content-form";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useCrudRecord } from "@/hooks/use-crud-record";

export default function EditRightsContentPage({ params }: { params: Promise<{ rightsContentId: string }> }) {
  const { rightsContentId } = use(params);
  const record = useCrudRecord((repo) => repo.rightsContent, rightsContentId);

  if (record === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (record === null) {
    return <EmptyState title="Record not found" description="This record doesn't exist locally, or it was removed." />;
  }

  return (
    <>
      <PageHeader title={`Edit "${record.title}"`} description="Changes are only saved once you choose Save as draft, Mark ready for review, or Publish." />
      <RightsContentForm initialRecord={record} />
    </>
  );
}
