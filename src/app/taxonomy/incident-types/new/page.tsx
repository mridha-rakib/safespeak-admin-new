"use client";

import { IncidentTypeForm } from "@/components/taxonomy/incident-types/incident-type-form";
import { PageHeader } from "@/components/layout/page-header";

export default function NewIncidentTypePage() {
  return (
    <>
      <PageHeader title="Add incident type" description="Create a new controlled incident classification." />
      <IncidentTypeForm mode="create" />
    </>
  );
}
