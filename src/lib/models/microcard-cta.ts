import { z } from "zod";

/**
 * A Microcard's optional call-to-action. Every type other than `none` and
 * `start_report` points at a *stable ID or a controlled internal path* —
 * never at raw markup or an arbitrary target — so a CTA can never become an
 * injection vector or a dead link invented at export time.
 */
export const MICROCARD_CTA_TYPES = [
  "none",
  "view_rights_information",
  "view_legislation_source",
  "view_support_service",
  "start_report",
  "open_internal_route",
  "open_safe_external_link",
] as const;
export type MicrocardCtaType = (typeof MICROCARD_CTA_TYPES)[number];

/**
 * Hand-maintained anchor list for the (future) user-facing frontend. This
 * admin app does not import safespeak-frontend's router (out of scope this
 * phase), so this is deliberately a small, explicit, admin-owned allow-list
 * of plausible destinations rather than a live validation against the real
 * frontend — see docs/ARCHITECTURE.md "Call-to-Action policy" for why.
 */
export const MICROCARD_INTERNAL_ROUTES = [
  "/",
  "/rights",
  "/support",
  "/report",
  "/resources",
  "/emergency",
] as const;
export type MicrocardInternalRoute = (typeof MICROCARD_INTERNAL_ROUTES)[number];

const HTTPS_URL_PATTERN = /^https:\/\//i;

export const microcardCtaSchema = z
  .object({
    type: z.enum(MICROCARD_CTA_TYPES).default("none"),
    label: z.string().optional(),
    /** Meaning depends on `type`: a RightsContent/Document/SupportOrganisation id, a MICROCARD_INTERNAL_ROUTES path, or an https:// URL. Unused (and ignored) for "none" and "start_report". */
    target: z.string().optional(),
  })
  .superRefine((cta, ctx) => {
    if (cta.type === "none" || cta.type === "start_report") return;
    if (!cta.target || cta.target.trim().length === 0) {
      ctx.addIssue({ code: "custom", path: ["target"], message: "This call-to-action type needs a target." });
      return;
    }
    if (cta.type === "open_internal_route") {
      if (!(MICROCARD_INTERNAL_ROUTES as readonly string[]).includes(cta.target)) {
        ctx.addIssue({ code: "custom", path: ["target"], message: "Choose one of the supported internal routes." });
      }
      return;
    }
    if (cta.type === "open_safe_external_link") {
      if (!HTTPS_URL_PATTERN.test(cta.target)) {
        ctx.addIssue({ code: "custom", path: ["target"], message: "External links must start with https://." });
      }
      return;
    }
    // view_rights_information / view_legislation_source / view_support_service: `target` is a stable
    // record id, checked for existence (and non-archived-for-new-selections) by the eligibility helpers,
    // not by this schema — Zod only confirms the shape here.
  });
export type MicrocardCta = z.infer<typeof microcardCtaSchema>;

export const MICROCARD_CTA_TYPE_LABEL: Record<MicrocardCtaType, string> = {
  none: "No call-to-action",
  view_rights_information: "View rights information",
  view_legislation_source: "View legislation source",
  view_support_service: "View a support service",
  start_report: "Start a report",
  open_internal_route: "Open an internal page",
  open_safe_external_link: "Open a safe external link",
};
