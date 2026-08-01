"use client";

import { useEffect, useState } from "react";

import { useAdminRepository } from "@/components/providers/repository-provider";
import { ADMIN_ACCOUNT_EVENT, type AdminAccount } from "@/lib/models/admin-account";

/**
 * Deliberately not `useLiveQuery` (unlike `useAppSettings`, which is only
 * ever mounted on the Settings page). This hook backs the Header's account
 * trigger, which — via `AdminShell` — is mounted on every route for the
 * lifetime of the app. A live Dexie subscription there means every route
 * carries a persistent IndexedDB observer, which reproducibly stalled
 * Playwright's click dispatch across unrelated pre-existing specs (clicking
 * anything, anywhere, soon after navigation) once this hook shipped —
 * consistent with this suite's already-documented IndexedDB-per-context
 * click-dispatch stall class. A plain fetch-once-and-listen-for-the-save-
 * event mirrors `safespeak-frontend`'s `useSafeSpeakProfile` /
 * `SAFESPEAK_PROFILE_EVENT` pattern for the exact same "identity shown in
 * global chrome" problem.
 */
export function useAdminAccount(): AdminAccount | undefined {
  const { repository } = useAdminRepository();
  const [account, setAccount] = useState<AdminAccount | undefined>(undefined);

  useEffect(() => {
    if (!repository) {
      return;
    }

    let isActive = true;

    const load = () => {
      void repository.adminAccount.get().then((next) => {
        if (isActive) {
          setAccount(next);
        }
      });
    };

    load();
    window.addEventListener(ADMIN_ACCOUNT_EVENT, load);

    return () => {
      isActive = false;
      window.removeEventListener(ADMIN_ACCOUNT_EVENT, load);
    };
  }, [repository]);

  return account;
}
