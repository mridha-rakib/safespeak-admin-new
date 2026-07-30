"use client";

import { useId } from "react";
import { useFormContext } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Label, Textarea } from "@/components/ui/input";
import type { DocumentFormValues } from "@/lib/legislation/document-form-schema";

export function StepGovernance() {
  const { register } = useFormContext<DocumentFormValues>();
  const legalReviewDescId = useId();
  const aiPermissionDescId = useId();

  return (
    <div className="space-y-5">
      <Alert tone="info" title="AI use allowed and Published are not the same thing">
        A document can be published for administrative or user reference without being used by any AI
        feature. AI usage additionally requires a completed legal review and successful local text
        extraction — see the checklist on the next step.
      </Alert>

      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
        <input
          id="legalReviewComplete"
          type="checkbox"
          className="mt-1"
          aria-describedby={legalReviewDescId}
          {...register("legalReviewComplete")}
        />
        <label htmlFor="legalReviewComplete">
          <span className="block text-sm font-semibold text-foreground">Legal review complete</span>
          <span id={legalReviewDescId} className="block text-xs text-muted-foreground">
            Required before this record can be published.
          </span>
        </label>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
        <input
          id="aiUsagePermission"
          type="checkbox"
          className="mt-1"
          aria-describedby={aiPermissionDescId}
          {...register("aiUsagePermission")}
        />
        <label htmlFor="aiUsagePermission">
          <span className="block text-sm font-semibold text-foreground">AI use allowed</span>
          <span id={aiPermissionDescId} className="block text-xs text-muted-foreground">
            Only affects whether this record is eligible for the AI-ready export once published — it does
            not by itself publish or index anything.
          </span>
        </label>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reviewNotes">Review notes (internal only)</Label>
        <Textarea id="reviewNotes" rows={4} {...register("reviewNotes")} />
        <p className="text-xs text-muted-foreground">
          Internal notes are never included in the Published Content Bundle.
        </p>
      </div>
    </div>
  );
}
