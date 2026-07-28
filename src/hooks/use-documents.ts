"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { useAdminRepository } from "@/components/providers/repository-provider";
import type { DocumentRecord } from "@/lib/models/document";

export function useDocuments(): DocumentRecord[] | undefined {
  const { repository } = useAdminRepository();

  return useLiveQuery(async () => {
    if (!repository) return undefined;
    return repository.documents.list();
  }, [repository]);
}
