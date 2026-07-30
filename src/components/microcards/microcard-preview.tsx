import { Badge } from "@/components/ui/badge";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import { CONTENT_PRIORITY_LABEL } from "@/lib/models/content-common";
import type { Microcard } from "@/lib/models/microcard";
import { MICROCARD_CTA_TYPE_LABEL } from "@/lib/models/microcard-cta";

/**
 * Approximates how a Microcard will read to an end user in safespeak-frontend
 * (not a pixel-accurate render — this admin app does not import that app's
 * components). Shows exactly the fields a user would see: no status,
 * internal notes, or other admin-only metadata.
 */
export function MicrocardPreview({ record }: { record: Microcard }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        {record.cardType ? <Badge tone="primary">{record.cardType.replace(/_/g, " ")}</Badge> : null}
        {record.priority !== "normal" ? <Badge tone={record.priority === "critical" ? "destructive" : "neutral"}>{CONTENT_PRIORITY_LABEL[record.priority]} priority</Badge> : null}
        {record.jurisdiction ? <Badge tone="neutral">{jurisdictionLabel(record.jurisdiction)}</Badge> : null}
      </div>

      <h3 className="text-lg font-semibold text-foreground">{record.title || "Untitled microcard"}</h3>
      <p className="text-sm text-foreground">{record.summary || "No short guidance written yet."}</p>

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

      {record.cta.type !== "none" ? (
        <button
          type="button"
          disabled
          className="mt-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground opacity-90"
        >
          {record.cta.label?.trim() || MICROCARD_CTA_TYPE_LABEL[record.cta.type]}
        </button>
      ) : null}
    </div>
  );
}
