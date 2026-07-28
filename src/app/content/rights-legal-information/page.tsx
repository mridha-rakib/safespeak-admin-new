"use client";

import { ModuleFoundationPage } from "@/components/layout/module-foundation-page";
import { useCrudList } from "@/hooks/use-crud-list";

export default function RightsLegalInformationPage() {
  const records = useCrudList((repo) => repo.rightsContent);

  return (
    <ModuleFoundationPage
      title="Rights & Legal Information"
      description="Plain-language explanations of rights, linked to source legislation. Never presented as legal advice."
      recordCount={records?.length}
      fieldsPrepared={[
        "title",
        "summary",
        "body",
        "jurisdiction",
        "relatedLegislationIds",
        "incidentTypeIds",
        "status",
      ]}
    />
  );
}
