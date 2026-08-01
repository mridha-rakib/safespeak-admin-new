"use client";

import { IconPlus } from "@tabler/icons-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { documentColumns } from "@/components/legislation/document-columns";
import { DocumentFiltersPanel } from "@/components/legislation/document-filters-panel";
import { RagReadinessTab } from "@/components/legislation/rag-readiness-tab";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/table/data-table";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDocuments } from "@/hooks/use-documents";
import { applyDocumentFilters, DEFAULT_DOCUMENT_FILTERS, type DocumentFilterState } from "@/lib/legislation/document-filters";

export default function KnowledgeLegislationPage() {
  const documents = useDocuments();
  const [filters, setFilters] = useState<DocumentFilterState>(DEFAULT_DOCUMENT_FILTERS);

  const filteredDocuments = useMemo(
    () => (documents ? applyDocumentFilters(documents, filters) : documents),
    [documents, filters]
  );

  return (
    <>
      <PageHeader
        title="Knowledge & Legislation"
        description="Source documents and legislation, with local text extraction, chunk preview, and publishing governance."
        actions={
          <Link href="/content/knowledge-legislation/new" className={buttonVariants()}>
            <IconPlus size={16} aria-hidden="true" />
            Add document
          </Link>
        }
      />

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="rag-readiness">RAG readiness</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <div className="space-y-4">
            <DocumentFiltersPanel filters={filters} onChange={setFilters} />
            {documents && documents.length > 0 && filteredDocuments && filteredDocuments.length === 0 ? (
              <p role="status" className="text-sm text-muted-foreground">
                No documents match the current filters.
              </p>
            ) : null}
            <DataTable
              caption="Knowledge and legislation documents"
              columns={documentColumns}
              data={filteredDocuments}
              searchPlaceholder="Search documents..."
              emptyTitle={documents && documents.length > 0 ? "No documents match the current filters" : "No documents yet"}
              emptyDescription={
                documents && documents.length > 0
                  ? "Try clearing filters or searching for something else."
                  : "Choose Add document to upload your first PDF."
              }
              pageSizeStorageKey="safespeak-admin:knowledge-documents:page-size"
            />
          </div>
        </TabsContent>

        <TabsContent value="rag-readiness">
          <RagReadinessTab documents={documents} />
        </TabsContent>
      </Tabs>
    </>
  );
}
