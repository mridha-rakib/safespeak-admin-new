"use client";

import { ResourceCategoryForm } from "@/components/taxonomy/resource-categories/resource-category-form";
import { PageHeader } from "@/components/layout/page-header";

export default function NewResourceCategoryPage() {
  return (
    <>
      <PageHeader title="Add resource category" description="Create a new category used to group support resources." />
      <ResourceCategoryForm mode="create" />
    </>
  );
}
