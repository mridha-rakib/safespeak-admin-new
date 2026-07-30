import { Badge } from "@/components/ui/badge";
import { VerificationBadge } from "@/components/ui/status-badge";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import { ORGANISATION_TYPE_LABEL } from "@/lib/models/organisation-type";
import type { SupportOrganisation } from "@/lib/models/support-organisation";
import { deriveOrganisationContactCapabilities, mailtoHref, telHref } from "@/lib/support-directory/contact";

/**
 * Approximates how a Support Organisation will read to an end user (not a
 * pixel-accurate render of safespeak-frontend). Shows only public fields —
 * never Internal Notes or Verification Notes — and never implies
 * endorsement, guaranteed availability, or that the service is free unless
 * the record explicitly says so. See README "Safety wording."
 */
export function SupportOrganisationPreview({ record }: { record: SupportOrganisation }) {
  const capabilities = deriveOrganisationContactCapabilities(record);
  const showNotVerifiedWarning = record.verificationStatus !== "verified";

  return (
    <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        {record.organisationType ? <Badge tone="primary">{ORGANISATION_TYPE_LABEL[record.organisationType]}</Badge> : null}
        {record.emergencyService ? <Badge tone="destructive">Emergency service</Badge> : null}
        <VerificationBadge status={record.verificationStatus} />
      </div>

      {showNotVerifiedWarning ? (
        <p role="status" className="rounded-lg border border-warning/30 bg-warning/10 p-2 text-xs text-foreground">
          Publication does not imply verification. Contact the service directly to confirm current details.
        </p>
      ) : null}

      <h3 className="text-lg font-semibold text-foreground">{record.name || "Untitled organisation"}</h3>
      <p className="text-sm text-foreground">{record.shortDescription || "No short description written yet."}</p>
      {record.fullDescription ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{record.fullDescription}</p> : null}

      <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
        <span>{record.australiaWide ? "Australia-wide" : record.jurisdictions.map(jurisdictionLabel).join(", ") || "Jurisdiction not set"}</span>
        {record.languages.length > 0 ? <span>· {record.languages.join(", ")}</span> : null}
      </div>

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
      {record.openingHours ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Opening hours: </span>
          {record.openingHours}
        </p>
      ) : null}
      {record.accessibilityInformation ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Accessibility: </span>
          {record.accessibilityInformation}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {capabilities.canCall && record.phone ? (
          <a href={telHref(record.phone)} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            Call
          </a>
        ) : null}
        {capabilities.canEmail && record.email ? (
          <a href={mailtoHref(record.email)} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground">
            Email
          </a>
        ) : null}
        {capabilities.canVisitWebsite && record.website ? (
          <a href={record.website} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground">
            Visit website
          </a>
        ) : null}
        {capabilities.canBook && record.bookingUrl ? (
          <a href={record.bookingUrl} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground">
            Book
          </a>
        ) : null}
        {capabilities.canRefer && record.referralUrl ? (
          <a href={record.referralUrl} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground">
            Referral information
          </a>
        ) : null}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Availability information is administrator-maintained and may not be current. Contact the service directly to confirm eligibility and availability.
      </p>
    </div>
  );
}
