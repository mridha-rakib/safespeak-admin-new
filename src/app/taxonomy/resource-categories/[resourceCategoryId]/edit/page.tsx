"use client";

import { use } from "react";

import { ResourceCategoryForm } from "@/components/taxonomy/resource-categories/resource-category-form";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useTaxonomyRecord } from "@/hooks/use-taxonomy-record";

export default function EditResourceCategoryPage({ params }: { params: Promise<{ resourceCategoryId: string }> }) {
  const { resourceCategoryId } = use(params);
  const record = useTaxonomyRecord((repo) => repo.resourceCategories, resourceCategoryId);

  if (record === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (record === null) {
    return <EmptyState title="Resource category not found" description="This record doesn't exist locally, or it was removed." />;
  }

  return (
    <>
      <PageHeader title={`Edit "${record.name}"`} description="Changes are only saved once you choose Save as draft, Mark ready for review, or Publish." />
      <ResourceCategoryForm mode="edit" initialRecord={record} />
    </>
  );
}
