/**
 * Phase 8.4 — the shared "how do we show this person" helper for the Admin
 * self-profile, reused by both the Header's account trigger and the Profile
 * page's avatar. Deliberately separate from
 * `lib/models/support-professional.ts`'s `initialsForName` (a support
 * professional is content this admin manages, a different domain) rather
 * than importing across that boundary — mirrors safespeak-frontend's
 * `src/lib/user-identity.ts`.
 */
export function getPersonInitials(name: string | null | undefined): string {
  const source = name?.trim() || "Local Administrator";
  const parts = source.split(/\s+/).filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
