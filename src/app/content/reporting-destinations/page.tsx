"use client";

import { ModuleFoundationPage } from "@/components/layout/module-foundation-page";
import { useCrudList } from "@/hooks/use-crud-list";

export default function ReportingDestinationsPage() {
  const records = useCrudList((repo) => repo.reportingDestinations);

  return (
    <ModuleFoundationPage
      title="Reporting Destinations"
      description="Where an incident can formally be reported — agencies, regulators, and internal offices."
      recordCount={records?.length}
      fieldsPrepared={[
        "name",
        "agencyType",
        "jurisdiction",
        "incidentTypeIds",
        "phone",
        "email",
        "website",
        "reportingInstructions",
        "status",
      ]}
    />
  );
}
