"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { useAdminRepository } from "@/components/providers/repository-provider";
import type { DocumentChunk } from "@/lib/models/document";

export function useDocumentChunks(documentId: string): DocumentChunk[] | undefined {
  const { repository } = useAdminRepository();

  return useLiveQuery(async () => {
    if (!repository) return undefined;
    return repository.documentChunks.listForDocument(documentId);
  }, [repository, documentId]);
}
