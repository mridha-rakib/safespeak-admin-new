"use client";

import { DocumentFormWizard } from "@/components/legislation/document-form-wizard";
import { PageHeader } from "@/components/layout/page-header";

export default function NewDocumentPage() {
  return (
    <>
      <PageHeader
        title="Add document"
        description="Upload a PDF, describe its source, and set legal and AI governance before publishing."
      />
      <DocumentFormWizard mode="create" />
    </>
  );
}
