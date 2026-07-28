"use client";

import { ModuleFoundationPage } from "@/components/layout/module-foundation-page";
import { useCrudList } from "@/hooks/use-crud-list";

export default function MicrocardsPage() {
  const records = useCrudList((repo) => repo.microcards);

  return (
    <ModuleFoundationPage
      title="Microcards"
      description="Short, plain-language educational cards administrators can prepare ahead of full content management."
      recordCount={records?.length}
      fieldsPrepared={["title", "summary", "body", "topic", "tags", "incidentTypeIds", "status"]}
    />
  );
}
