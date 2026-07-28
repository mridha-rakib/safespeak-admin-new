"use client";

import { ModuleFoundationPage } from "@/components/layout/module-foundation-page";
import { useCrudList } from "@/hooks/use-crud-list";

export default function SupportOrganisationsPage() {
  const records = useCrudList((repo) => repo.supportOrganisations);

  return (
    <ModuleFoundationPage
      title="Support Organisations"
      description="Organisations that offer support services, with jurisdiction and incident-type matching context."
      recordCount={records?.length}
      fieldsPrepared={[
        "name",
        "servicesOffered",
        "incidentTypeIds",
        "jurisdictions",
        "phone",
        "email",
        "website",
        "verified",
        "status",
      ]}
    />
  );
}
