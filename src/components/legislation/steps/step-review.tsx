"use client";

import { IconAlertTriangle, IconCircleCheck } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCrudList } from "@/hooks/use-crud-list";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import { getPublicationBlockers, getRagReadinessChecklist } from "@/lib/legislation/readiness";
import type { DocumentRecord } from "@/lib/models/document";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-1.5 text-sm sm:grid-cols-3 sm:gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="sm:col-span-2 text-foreground">{value || "Not set"}</dd>
    </div>
  );
}

export function StepReview({
  previewDocument,
  isSaving,
  onSave,
}: {
  previewDocument: DocumentRecord;
  isSaving: boolean;
  onSave: (target: "draft" | "ready_for_review" | "published") => void;
}) {
  const incidentTypes = useCrudList((repo) => repo.incidentTypes);
  const incidentNames = (previewDocument.incidentTypeIds ?? [])
    .map((id) => incidentTypes?.find((t) => t.id === id)?.name ?? id)
    .join(", ");

  const blockers = getPublicationBlockers(previewDocument);
  const checklist = getRagReadinessChecklist(previewDocument);
  const canPublish = blockers.length === 0;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Source and authority</CardTitle>
        </CardHeader>
        <CardContent>
          <dl>
            <SummaryRow label="Title" value={previewDocument.title} />
            <SummaryRow label="Source type" value={previewDocument.sourceType.replace(/_/g, " ")} />
            <SummaryRow label="Source category" value={previewDocument.sourceCategory ?? ""} />
            <SummaryRow label="Authority / publisher" value={previewDocument.authorityOrPublisher ?? ""} />
            <SummaryRow label="Jurisdiction" value={jurisdictionLabel(previewDocument.jurisdiction)} />
            <SummaryRow label="Language" value={previewDocument.language} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dates and legal scope</CardTitle>
        </CardHeader>
        <CardContent>
          <dl>
            <SummaryRow label="Effective date" value={previewDocument.effectiveDate ?? ""} />
            <SummaryRow label="Next review date" value={previewDocument.nextReviewDate ?? ""} />
            <SummaryRow label="License status" value={previewDocument.licenseStatus.replace(/_/g, " ")} />
            <SummaryRow label="Topic" value={previewDocument.topic ?? ""} />
            <SummaryRow label="Relevant sections" value={(previewDocument.relevantSections ?? []).join("; ")} />
            <SummaryRow label="Tags" value={(previewDocument.tags ?? []).join(", ")} />
            <SummaryRow label="Incident categories" value={incidentNames} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI usage and legal review</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge tone={previewDocument.legalReviewComplete ? "success" : "warning"}>
            {previewDocument.legalReviewComplete ? "Legal review complete" : "Needs legal review"}
          </Badge>
          <Badge tone={previewDocument.aiUsagePermission ? "success" : "neutral"}>
            {previewDocument.aiUsagePermission ? "AI use allowed" : "AI use not allowed"}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Processing readiness</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {checklist.map((item) => (
              <li key={item.key} className="flex items-center gap-2 text-sm">
                {item.met ? (
                  <IconCircleCheck size={16} className="text-success" aria-hidden="true" />
                ) : (
                  <IconAlertTriangle size={16} className="text-warning" aria-hidden="true" />
                )}
                <span className={item.met ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {!canPublish ? (
        <div role="status" className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
          <p className="font-semibold">Publish is not available yet:</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
            {blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" disabled={isSaving} onClick={() => onSave("draft")}>
          Save as draft
        </Button>
        <Button variant="secondary" disabled={isSaving} onClick={() => onSave("ready_for_review")}>
          Mark ready for review
        </Button>
        <Button disabled={isSaving || !canPublish} onClick={() => onSave("published")}>
          Publish
        </Button>
      </div>
    </div>
  );
}
