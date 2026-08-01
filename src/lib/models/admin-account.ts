import { z } from "zod";

/**
 * Phase 8.4 — the logged-in Admin's own self-profile record. There is no
 * Admin registration, no Admin directory, and no multi-admin support in this
 * phase (see `LOCAL_ADMIN_ACTOR` in `./base.ts`) — this is a single,
 * singleton row (same pattern as `AppSettings`/`APP_SETTINGS_ID`) holding
 * only what this one local administrator can genuinely edit about how they
 * are addressed in this browser. It is never used for sign-in — there is no
 * authentication in this app to sign in to.
 */
export const ADMIN_ACCOUNT_ID = "local-admin-account";

/**
 * Fired on `window` after a successful save so the Header's account trigger
 * (which reads this record once on mount, not via a live Dexie subscription
 * — see `hooks/use-admin-account.ts` for why) can refresh without polling.
 */
export const ADMIN_ACCOUNT_EVENT = "safespeak-admin-account-updated";

export const adminAccountSchema = z.object({
  id: z.literal(ADMIN_ACCOUNT_ID).default(ADMIN_ACCOUNT_ID),
  displayName: z.string().min(1).default("Local Administrator"),
  /** Optional, for this admin's own reference only — never used to sign in or to contact anyone. */
  contactEmail: z.string().optional(),
  updatedAt: z.string().min(1),
});
export type AdminAccount = z.infer<typeof adminAccountSchema>;
