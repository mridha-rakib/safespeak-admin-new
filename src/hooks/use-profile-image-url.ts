"use client";

import { useEffect, useState } from "react";

import { useAdminRepository } from "@/components/providers/repository-provider";

/**
 * Fetches a stored profile-image Blob and exposes it as a temporary object
 * URL for display only — the URL is revoked on every change and on
 * unmount, and is never itself persisted (see README "Profile image export
 * policy"). Returns `undefined` while loading or when there is no stored
 * image, and `null` is never returned (unlike the record hooks) since "no
 * image" isn't a loading state here — callers fall back to the initials
 * avatar directly.
 */
export function useProfileImageUrl(professionalId: string | undefined, hasStoredImage: boolean): string | undefined {
  const { repository } = useAdminRepository();
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!repository || !professionalId || !hasStoredImage) {
      setUrl(undefined);
      return;
    }

    let cancelled = false;
    let objectUrl: string | undefined;

    void repository.supportProfessionals.getProfileImage(professionalId).then((blob) => {
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [repository, professionalId, hasStoredImage]);

  return url;
}
