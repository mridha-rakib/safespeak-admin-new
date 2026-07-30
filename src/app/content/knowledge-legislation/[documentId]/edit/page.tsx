"use client";

import { use } from "react";

import { DocumentFormWizard } from "@/components/legislation/document-form-wizard";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocument } from "@/hooks/use-document";

export default function EditDocumentPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = use(params);
  const document = useDocument(documentId);

  if (document === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (document === null) {
    return (
      <EmptyState
        title="Document not found"
        description="This document doesn't exist locally, or it was removed. Check the Knowledge & Legislation list."
      />
    );
  }

  return (
    <>
      <PageHeader title={`Edit "${document.title}"`} description="Changes are only saved once you choose Save as draft, Mark ready for review, or Publish." />
      <DocumentFormWizard mode="edit" initialDocument={document} />
    </>
  );
}
