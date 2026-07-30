"use client";

import { PROFESSIONAL_TYPE_LABEL } from "@/components/advocates-counsellors/columns";
import { Badge } from "@/components/ui/badge";
import { VerificationBadge } from "@/components/ui/status-badge";
import { useProfileImageUrl } from "@/hooks/use-profile-image-url";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import { COST_TYPE_LABEL } from "@/lib/support-directory/labels";
import { initialsForName, type SupportProfessional } from "@/lib/models/support-professional";
import { deriveProfessionalContactCapabilities, mailtoHref, telHref } from "@/lib/support-directory/contact";

/**
 * Approximates how an Advocate/Counsellor profile will read to an end user
 * (not a pixel-accurate render of safespeak-frontend). Never claims live
 * availability, guaranteed response time, or that this person will accept
 * a new client — Availability Notes are shown as administrator-maintained
 * text only. See README "Safety wording."
 */
export function ProfessionalPreview({ record, localImageUrl }: { record: SupportProfessional; localImageUrl?: string }) {
  const capabilities = deriveProfessionalContactCapabilities(record);
  const showNotVerifiedWarning = record.verificationStatus !== "verified";
  const displayName = record.displayName?.trim() || record.fullName;
  const storedImageUrl = useProfileImageUrl(record.id, Boolean(record.profilePhoto) && !localImageUrl);
  const imageUrl = localImageUrl ?? storedImageUrl;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a locally-managed object URL, not an optimizable remote/static asset
          <img src={imageUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary"
          >
            {initialsForName(displayName || "?")}
          </span>
        )}
        <div>
          <h3 className="text-lg font-semibold text-foreground">{displayName || "Unnamed professional"}</h3>
          <p className="text-xs text-muted-foreground">
            {PROFESSIONAL_TYPE_LABEL[record.professionalType]}
            {record.jobTitle ? ` · ${record.jobTitle}` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <VerificationBadge status={record.verificationStatus} />
        {record.costType !== "unknown" ? <Badge tone="neutral">{COST_TYPE_LABEL[record.costType]}</Badge> : null}
      </div>

      {showNotVerifiedWarning ? (
        <p role="status" className="rounded-lg border border-warning/30 bg-warning/10 p-2 text-xs text-foreground">
          Not verified. Publication does not imply verification.
        </p>
      ) : null}

      <p className="text-sm text-foreground">{record.shortIntroduction || "No short summary written yet."}</p>
      {record.fullBiography ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{record.fullBiography}</p> : null}

      {record.specialisations.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {record.specialisations.map((s) => (
            <span key={s} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
              {s}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
        <span>{record.australiaWide ? "Australia-wide" : record.jurisdictions.map(jurisdictionLabel).join(", ") || "Jurisdiction not set"}</span>
        {record.languages.length > 0 ? <span>· {record.languages.join(", ")}</span> : null}
      </div>

      {record.availability ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Availability: </span>
          {record.availability} — administrator-maintained, not a live signal.
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
        {capabilities.canBook && record.bookingUrl ? (
          <a href={record.bookingUrl} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground">
            Book
          </a>
        ) : null}
        {capabilities.canVisitWebsite && record.organisationWebsite ? (
          <a href={record.organisationWebsite} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground">
            Visit website
          </a>
        ) : null}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Availability information is administrator-maintained and may not be current. Contact directly to confirm eligibility and availability.
      </p>
    </div>
  );
}
