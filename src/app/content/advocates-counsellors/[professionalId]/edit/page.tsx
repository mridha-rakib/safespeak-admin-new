"use client";

import { use } from "react";

import { ProfessionalForm } from "@/components/advocates-counsellors/professional-form";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useCrudRecord } from "@/hooks/use-crud-record";

export default function EditProfessionalPage({ params }: { params: Promise<{ professionalId: string }> }) {
  const { professionalId } = use(params);
  const record = useCrudRecord((repo) => repo.supportProfessionals, professionalId);

  if (record === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (record === null) {
    return <EmptyState title="Profile not found" description="This record doesn't exist locally, or it was removed." />;
  }

  return (
    <>
      <PageHeader title={`Edit "${record.fullName}"`} description="Changes are only saved once you choose Save as draft, Mark ready for review, or Publish." />
      <ProfessionalForm initialRecord={record} />
    </>
  );
}
