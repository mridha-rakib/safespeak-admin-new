"use client";

import { RightsContentForm } from "@/components/rights-content/rights-content-form";
import { PageHeader } from "@/components/layout/page-header";

export default function NewRightsContentPage() {
  return (
    <>
      <PageHeader title="Add Rights & Legal Information record" description="Create a new plain-language explanation of rights, linked to source legislation." />
      <RightsContentForm />
    </>
  );
}
