import type { SupportProfessional } from "@/lib/models/support-professional";

/**
 * The future user frontend only offers a contact action when the underlying
 * field is actually present and non-empty — never a fake/disabled button.
 * These helpers are the single source of truth for that derivation so the
 * admin preview and the (future) frontend integration cannot drift apart.
 */
export interface ContactCapabilities {
  canCall: boolean;
  canEmail: boolean;
  canBook: boolean;
  canVisitWebsite: boolean;
}

function isNonEmpty(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function deriveContactCapabilities(
  professional: Pick<SupportProfessional, "phone" | "email" | "bookingUrl" | "organisationWebsite">
): ContactCapabilities {
  return {
    canCall: isNonEmpty(professional.phone),
    canEmail: isNonEmpty(professional.email),
    canBook: isNonEmpty(professional.bookingUrl),
    canVisitWebsite: isNonEmpty(professional.organisationWebsite),
  };
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, "")}`;
}

export function mailtoHref(email: string): string {
  return `mailto:${email}`;
}
