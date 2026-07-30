import type { ReportingDestination } from "@/lib/models/reporting-destination";
import type { ReportingMethod } from "@/lib/models/reporting-destination-type";
import { isSafeUrl } from "@/lib/support-directory/contact";

function isNonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * The one place that knows which stored field(s) back each reporting
 * method — used both by publish eligibility (a selected method without its
 * backing data blocks Ready for review / Publish) and by the user-facing
 * preview (a method is only ever shown as available when this returns
 * true), so the two can never disagree about what "supported" means.
 */
export function isReportingMethodSupported(
  method: ReportingMethod,
  record: Pick<
    ReportingDestination,
    "phone" | "email" | "onlineReportingUrl" | "website" | "address" | "bookingUrl" | "reportingInstructions"
  >
): boolean {
  switch (method) {
    case "phone":
      return isNonEmpty(record.phone);
    case "email":
      return Boolean(record.email && record.email.trim().length > 0);
    case "online_form":
      return isSafeUrl(record.onlineReportingUrl);
    case "website":
      return isSafeUrl(record.website);
    case "in_person":
      return isNonEmpty(record.address);
    case "appointment":
      return isSafeUrl(record.bookingUrl) || isNonEmpty(record.reportingInstructions);
    case "postal":
      return isNonEmpty(record.address);
    case "internal_route":
      return isNonEmpty(record.reportingInstructions);
    case "other":
      return true;
    default:
      return false;
  }
}

/** Every selected reporting method that is missing its required backing data — used as a Ready-for-review/Publish blocker source. */
export function getUnsupportedReportingMethods(
  record: Pick<
    ReportingDestination,
    "reportingMethods" | "phone" | "email" | "onlineReportingUrl" | "website" | "address" | "bookingUrl" | "reportingInstructions"
  >
): ReportingMethod[] {
  return record.reportingMethods.filter((method) => !isReportingMethodSupported(method, record));
}
