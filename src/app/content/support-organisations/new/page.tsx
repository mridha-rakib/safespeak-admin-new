"use client";

import { SupportOrganisationForm } from "@/components/support-organisations/support-organisation-form";
import { PageHeader } from "@/components/layout/page-header";

export default function NewSupportOrganisationPage() {
  return (
    <>
      <PageHeader title="Add Support Organisation" description="Create a new organisation record." />
      <SupportOrganisationForm />
    </>
  );
}
