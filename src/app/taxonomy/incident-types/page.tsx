"use client";

import { ModuleFoundationPage } from "@/components/layout/module-foundation-page";
import { useCrudList } from "@/hooks/use-crud-list";

export default function IncidentTypesPage() {
  const records = useCrudList((repo) => repo.incidentTypes);

  return (
    <ModuleFoundationPage
      title="Incident Types"
      description="The categories used to classify an incident across the rest of the taxonomy."
      recordCount={records?.length}
      fieldsPrepared={["name", "description", "category"]}
    />
  );
}
