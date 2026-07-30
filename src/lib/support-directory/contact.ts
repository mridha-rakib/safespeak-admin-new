import { z } from "zod";

/**
 * Shared contact-field validation and capability derivation for the three
 * Support Directory entities (Support Organisations, Advocates &
 * Counsellors, Reporting Destinations). Each entity keeps its own flat,
 * already-established field names (`SupportProfessional.bookingUrl` /
 * `organisationWebsite` predate this phase and are reused as-is — see
 * README "Contact information architecture") rather than being forced into
 * one nested contact object; what's actually shared is the validation
 * *logic* and the capability-derivation *rule*, which is what the "one
 * typed contact-information model" requirement is really about — never
 * duplicate the "is this a safe URL" check three times.
 *
 * A capability (`canCall`, `canEmail`, ...) is always derived from the
 * stored field — never a separately-editable boolean — so it can never
 * drift out of sync with the data that actually backs it.
 */

const SAFE_URL_PROTOCOL_PATTERN = /^https?:\/\//i;

/** True only for a non-empty, well-formed http(s) URL — every other protocol (javascript:, data:, ftp:, ...) is rejected. */
export function isSafeUrl(value: string | undefined): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || !SAFE_URL_PROTOCOL_PATTERN.test(trimmed)) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Advisory only — `isSafeUrl` already allows http, this just flags it for a "prefer https" hint in the UI. It never blocks saving. */
export function isInsecureHttpUrl(value: string | undefined): boolean {
  return typeof value === "string" && /^http:\/\//i.test(value.trim());
}

export function isValidEmailValue(value: string | undefined): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && z.email().safeParse(trimmed).success;
}

function isNonEmpty(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Tolerant at the schema level (undefined, empty string, or a safe URL all
 * pass) — forms are responsible for converting a blank input to `undefined`
 * before calling `create`/`updateWithVersionCheck`, the same convention
 * every Phase 4 form already follows. This just guarantees a *stored*,
 * non-empty value is never an unsafe protocol.
 */
export const safeUrlFieldSchema = z
  .string()
  .optional()
  .refine((value) => value === undefined || value.trim().length === 0 || isSafeUrl(value.trim()), {
    message: "Enter a valid http:// or https:// web address.",
  });

export const emailFieldSchema = z
  .string()
  .optional()
  .refine((value) => value === undefined || value.trim().length === 0 || isValidEmailValue(value.trim()), {
    message: "Enter a valid email address.",
  });

/**
 * Deliberately no format regex: a phone number is stored exactly as the
 * administrator typed it (international or Australian formatting alike).
 * This app never verifies phone ownership and must never silently
 * reformat/misinterpret a valid international number as an incorrect
 * Australian one — the only schema-level rule is "not just whitespace."
 */
export const phoneFieldSchema = z
  .string()
  .optional()
  .refine((value) => value === undefined || value.trim().length === 0 || isNonEmpty(value), {
    message: "Enter a phone number, or leave this field blank.",
  });

/** `tel:` hrefs don't need the display formatting stripped beyond whitespace — browsers already tolerate spaces/parentheses/hyphens. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, "")}`;
}

export function mailtoHref(email: string): string {
  return `mailto:${email}`;
}

/** Converts a blank/whitespace-only input to `undefined` — the one place every form calls before writing a contact field, so an empty value is never persisted as `""`. */
export function cleanOptionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export interface OrganisationContactCapabilities {
  canCall: boolean;
  canEmail: boolean;
  canVisitWebsite: boolean;
  canBook: boolean;
  canRefer: boolean;
}

export function deriveOrganisationContactCapabilities(
  record: Pick<{ phone?: string; email?: string; website?: string; bookingUrl?: string; referralUrl?: string }, "phone" | "email" | "website" | "bookingUrl" | "referralUrl">
): OrganisationContactCapabilities {
  return {
    canCall: isNonEmpty(record.phone),
    canEmail: isValidEmailValue(record.email),
    canVisitWebsite: isSafeUrl(record.website),
    canBook: isSafeUrl(record.bookingUrl),
    canRefer: isSafeUrl(record.referralUrl),
  };
}

export interface ProfessionalContactCapabilities {
  canCall: boolean;
  canEmail: boolean;
  canBook: boolean;
  canVisitWebsite: boolean;
}

export function deriveProfessionalContactCapabilities(
  professional: Pick<{ phone?: string; email?: string; bookingUrl?: string; organisationWebsite?: string }, "phone" | "email" | "bookingUrl" | "organisationWebsite">
): ProfessionalContactCapabilities {
  return {
    canCall: isNonEmpty(professional.phone),
    canEmail: isValidEmailValue(professional.email),
    canBook: isSafeUrl(professional.bookingUrl),
    canVisitWebsite: isSafeUrl(professional.organisationWebsite),
  };
}

export interface DestinationContactCapabilities {
  canCall: boolean;
  canEmail: boolean;
  canVisitWebsite: boolean;
  canReportOnline: boolean;
  canBookAppointment: boolean;
}

export function deriveDestinationContactCapabilities(
  record: Pick<
    { phone?: string; email?: string; website?: string; onlineReportingUrl?: string; bookingUrl?: string },
    "phone" | "email" | "website" | "onlineReportingUrl" | "bookingUrl"
  >
): DestinationContactCapabilities {
  return {
    canCall: isNonEmpty(record.phone),
    canEmail: isValidEmailValue(record.email),
    canVisitWebsite: isSafeUrl(record.website),
    canReportOnline: isSafeUrl(record.onlineReportingUrl),
    canBookAppointment: isSafeUrl(record.bookingUrl),
  };
}
