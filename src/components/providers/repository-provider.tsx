"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { createIndexedDbAdminContentRepository } from "@/lib/repositories/indexeddb-admin-content-repository";
import type { AdminContentRepository } from "@/lib/repositories/admin-content-repository";

interface RepositoryContextValue {
  repository: AdminContentRepository | null;
  isReady: boolean;
  recoveryNotice: string | null;
}

const RepositoryContext = createContext<RepositoryContextValue>({
  repository: null,
  isReady: false,
  recoveryNotice: null,
});

/**
 * Creates the repository singleton on the client, seeds demo data once, and
 * makes the repository available to the rest of the tree. Kept out of
 * individual page components on purpose — see lib/repositories for why pages
 * should never touch Dexie directly.
 */
export function RepositoryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RepositoryContextValue>({
    repository: null,
    isReady: false,
    recoveryNotice: null,
  });

  useEffect(() => {
    let cancelled = false;
    const repository = createIndexedDbAdminContentRepository();

    repository
      .ensureSeeded()
      .then(() => {
        if (!cancelled) setState({ repository, isReady: true, recoveryNotice: null });
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            repository,
            isReady: true,
            recoveryNotice:
              "Some locally stored data could not be loaded and was skipped. Your other content is unaffected. If this persists, use Settings → Reset demo data.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <RepositoryContext.Provider value={state}>{children}</RepositoryContext.Provider>;
}

export function useAdminRepository(): RepositoryContextValue {
  return useContext(RepositoryContext);
}
