"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { useAdminRepository } from "@/components/providers/repository-provider";
import type { DocumentChunk, DocumentRecord } from "@/lib/models/document";

/** Loads every chunk for the given documents into a documentId -> chunks map, for the local retrieval test. */
export function useAllDocumentChunks(documents: DocumentRecord[] | undefined): Map<string, DocumentChunk[]> | undefined {
  const { repository } = useAdminRepository();

  return useLiveQuery(async () => {
    if (!repository || !documents) return undefined;
    const entries = await Promise.all(
      documents.map(async (doc): Promise<[string, DocumentChunk[]]> => [doc.id, await repository.documentChunks.listForDocument(doc.id)])
    );
    return new Map(entries);
  }, [repository, documents]);
}
