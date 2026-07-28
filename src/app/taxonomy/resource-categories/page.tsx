"use client";

import { ModuleFoundationPage } from "@/components/layout/module-foundation-page";
import { useCrudList } from "@/hooks/use-crud-list";

export default function ResourceCategoriesPage() {
  const records = useCrudList((repo) => repo.resourceCategories);

  return (
    <ModuleFoundationPage
      title="Resource Categories"
      description="Groupings administrators use to organise content across every domain."
      recordCount={records?.length}
      fieldsPrepared={["name", "description", "parentCategoryId"]}
    />
  );
}
