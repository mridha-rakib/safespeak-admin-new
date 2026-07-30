"use client";

import { MicrocardForm } from "@/components/microcards/microcard-form";
import { PageHeader } from "@/components/layout/page-header";

export default function NewMicrocardPage() {
  return (
    <>
      <PageHeader title="Add microcard" description="Create a new short, plain-language educational card." />
      <MicrocardForm />
    </>
  );
}
