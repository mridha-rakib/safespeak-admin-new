"use client";

import { ProfessionalForm } from "@/components/advocates-counsellors/professional-form";
import { PageHeader } from "@/components/layout/page-header";

export default function NewProfessionalPage() {
  return (
    <>
      <PageHeader title="Add Advocate or Counsellor" description="Create a new support professional profile." />
      <ProfessionalForm />
    </>
  );
}
