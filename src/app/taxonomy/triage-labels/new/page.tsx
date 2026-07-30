"use client";

import { TriageLabelForm } from "@/components/taxonomy/triage-labels/triage-label-form";
import { PageHeader } from "@/components/layout/page-header";

export default function NewTriageLabelPage() {
  return (
    <>
      <PageHeader title="Add triage label" description="Create a new safety, urgency, or support label." />
      <TriageLabelForm mode="create" />
    </>
  );
}
