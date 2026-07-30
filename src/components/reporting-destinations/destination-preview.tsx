import { Badge } from "@/components/ui/badge";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import type { ReportingDestination } from "@/lib/models/reporting-destination";
import { DESTINATION_TYPE_LABEL, REPORTING_METHOD_LABEL, TRISTATE_LABEL } from "@/lib/models/reporting-destination-type";
import { isReportingMethodSupported } from "@/lib/support-directory/reporting-method";
import { isSafeUrl } from "@/lib/support-directory/contact";

/**
 * Approximates how a Reporting Destination will read to an end user (not a
 * pixel-accurate render of safespeak-frontend). Only ever shows a reporting
 * method as available when its backing contact data actually exists,
 * `Unknown` stays visible for anonymous-reporting/emergency-suitability
 * rather than reading as "No", and a non-emergency destination is never
 * presented as an emergency service. See README "Safety wording."
 */
export function DestinationPreview({ record }: { record: ReportingDestination }) {
  const supportedMethods = record.reportingMethods.filter((method) => isReportingMethodSupported(method, record));

  return (
    <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        {record.destinationType ? <Badge tone="primary">{DESTINATION_TYPE_LABEL[record.destinationType]}</Badge> : null}
        {record.emergencySuitability === "yes" ? <Badge tone="destructive">Emergency suitable</Badge> : null}
        <Badge tone="neutral">Anonymous reporting: {TRISTATE_LABEL[record.anonymousReporting]}</Badge>
      </div>

      <h3 className="text-lg font-semibold text-foreground">{record.name || "Untitled destination"}</h3>
      <p className="text-sm text-foreground">{record.description || "No short description written yet."}</p>
      {record.fullDescription ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{record.fullDescription}</p> : null}

      <p className="text-xs text-muted-foreground">
        {record.australiaWide ? "Australia-wide" : record.jurisdictions.map(jurisdictionLabel).join(", ") || "Jurisdiction not set"}
      </p>

      {record.reportingInstructions ? (
        <p className="text-sm text-foreground">
          <span className="font-semibold">How to report: </span>
          {record.reportingInstructions}
        </p>
      ) : null}
      {record.evidenceGuidance ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Evidence guidance: </span>
          {record.evidenceGuidance}
        </p>
      ) : null}
      {record.eligibilityInformation ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Eligibility: </span>
          {record.eligibilityInformation}
        </p>
      ) : null}
      {record.costInformation ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Cost: </span>
          {record.costInformation}
        </p>
      ) : null}
      {record.confidentialityInformation ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Confidentiality: </span>
          {record.confidentialityInformation}
        </p>
      ) : null}
      {record.responseExpectations ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">What to expect: </span>
          {record.responseExpectations}
        </p>
      ) : null}

      {supportedMethods.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {supportedMethods.map((method) => {
            const href =
              method === "phone" && record.phone
                ? `tel:${record.phone.replace(/\s+/g, "")}`
                : method === "email" && record.email
                  ? `mailto:${record.email}`
                  : method === "online_form" && isSafeUrl(record.onlineReportingUrl)
                    ? record.onlineReportingUrl
                    : method === "website" && isSafeUrl(record.website)
                      ? record.website
                      : method === "appointment" && isSafeUrl(record.bookingUrl)
                        ? record.bookingUrl
                        : undefined;
            return href ? (
              <a key={method} href={href} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                {REPORTING_METHOD_LABEL[method]}
              </a>
            ) : (
              <span key={method} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground">
                {REPORTING_METHOD_LABEL[method]}
              </span>
            );
          })}
        </div>
      ) : null}

      {record.publicDisclaimer ? (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-foreground">
          <p className="font-semibold">Disclaimer</p>
          <p className="text-muted-foreground">{record.publicDisclaimer}</p>
        </div>
      ) : null}

      <p className="text-[11px] text-muted-foreground">
        Anonymous reporting procedures may change. Confirm current requirements with the destination directly.
      </p>
    </div>
  );
}
