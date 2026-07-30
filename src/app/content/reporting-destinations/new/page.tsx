"use client";

import { DestinationForm } from "@/components/reporting-destinations/destination-form";
import { PageHeader } from "@/components/layout/page-header";

export default function NewReportingDestinationPage() {
  return (
    <>
      <PageHeader title="Add Reporting Destination" description="Create a new place an incident can formally be reported." />
      <DestinationForm />
    </>
  );
}
