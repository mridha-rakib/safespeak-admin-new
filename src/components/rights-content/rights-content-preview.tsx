import { Badge } from "@/components/ui/badge";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import { CONTENT_PRIORITY_LABEL } from "@/lib/models/content-common";
import type { RightsContent } from "@/lib/models/rights-content";
import { contentTypeRequiresLegalSource } from "@/lib/rights-content/eligibility";

/**
 * Approximates how a Rights & Legal Information record will read to an end
 * user (not a pixel-accurate render — see the same note on
 * components/microcards/microcard-preview.tsx). The public disclaimer, when
 * present, is shown exactly as a user would see it — never softened or
 * summarised, since this content must never read as personalised legal advice.
 */
export function RightsContentPreview({ record }: { record: RightsContent }) {
  const requiresDisclaimer = contentTypeRequiresLegalSource(record.contentType);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        {record.contentType ? <Badge tone="primary">{record.contentType.replace(/_/g, " ")}</Badge> : null}
        {record.priority !== "normal" ? <Badge tone={record.priority === "critical" ? "destructive" : "neutral"}>{CONTENT_PRIORITY_LABEL[record.priority]} priority</Badge> : null}
        {record.jurisdiction ? <Badge tone="neutral">{jurisdictionLabel(record.jurisdiction)}</Badge> : null}
      </div>

      <h3 className="text-lg font-semibold text-foreground">{record.title || "Untitled record"}</h3>
      <p className="text-sm text-foreground">{record.summary || "No short summary written yet."}</p>

      {record.body ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{record.body}</p> : null}

      {record.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {record.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {requiresDisclaimer ? (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-foreground">
          <p className="font-semibold">Disclaimer</p>
          <p className="text-muted-foreground">
            {record.publicDisclaimer?.trim() || "No disclaimer written yet — required before publish for this content type."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
