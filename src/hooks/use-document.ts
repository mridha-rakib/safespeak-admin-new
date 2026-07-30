"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { useAdminRepository } from "@/components/providers/repository-provider";
import type { DocumentRecord } from "@/lib/models/document";

/** `undefined` = still loading, `null` = genuinely not found, otherwise the record. */
export function useDocument(id: string): DocumentRecord | null | undefined {
  const { repository } = useAdminRepository();

  return useLiveQuery(async () => {
    if (!repository) return undefined;
    const doc = await repository.documents.get(id);
    return doc ?? null;
  }, [repository, id]);
}
