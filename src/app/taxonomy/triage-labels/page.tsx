"use client";

import { ModuleFoundationPage } from "@/components/layout/module-foundation-page";
import { useCrudList } from "@/hooks/use-crud-list";

export default function TriageLabelsPage() {
  const records = useCrudList((repo) => repo.triageLabels);

  return (
    <ModuleFoundationPage
      title="Triage Labels"
      description="Urgency and routing labels used to prioritise how an incident is handled."
      recordCount={records?.length}
      fieldsPrepared={["name", "description", "urgencyLevel"]}
    />
  );
}
