"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { useAdminRepository } from "@/components/providers/repository-provider";
import type { AppSettings } from "@/lib/models/app-settings";

export function useAppSettings(): AppSettings | undefined {
  const { repository } = useAdminRepository();

  return useLiveQuery(async () => {
    if (!repository) return undefined;
    return repository.settings.get();
  }, [repository]);
}
