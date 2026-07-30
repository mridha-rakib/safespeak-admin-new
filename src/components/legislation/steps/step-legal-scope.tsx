"use client";

import { Controller, useFormContext } from "react-hook-form";

import { TagListInput } from "@/components/legislation/tag-list-input";
import { Input, Label } from "@/components/ui/input";
import { useCrudList } from "@/hooks/use-crud-list";
import type { DocumentFormValues } from "@/lib/legislation/document-form-schema";
import { DOCUMENT_LICENSE_STATUSES, DOCUMENT_PRIORITIES } from "@/lib/models/document";

const LICENSE_LABEL: Record<(typeof DOCUMENT_LICENSE_STATUSES)[number], string> = {
  public_domain: "Public domain",
  government_open_license: "Government open license",
  restricted_internal_use: "Restricted — internal use only",
  requires_permission: "Requires permission",
  unknown: "Not yet determined",
};

const PRIORITY_LABEL: Record<(typeof DOCUMENT_PRIORITIES)[number], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function StepLegalScope() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<DocumentFormValues>();
  const incidentTypes = useCrudList((repo) => repo.incidentTypes);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="effectiveDate">Effective date</Label>
          <Input id="effectiveDate" type="date" {...register("effectiveDate")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastUpdatedDate">Last updated</Label>
          <Input id="lastUpdatedDate" type="date" {...register("lastUpdatedDate")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nextReviewDate">Next review date</Label>
          <Input id="nextReviewDate" type="date" aria-invalid={Boolean(errors.nextReviewDate)} {...register("nextReviewDate")} />
          {errors.nextReviewDate?.message ? (
            <p role="alert" className="text-xs text-destructive">
              {errors.nextReviewDate.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="licenseStatus">License status</Label>
          <select
            id="licenseStatus"
            className="flex h-10 w-full rounded-full border border-input bg-card px-4 text-sm text-foreground focus-visible:outline-none"
            {...register("licenseStatus")}
          >
            {DOCUMENT_LICENSE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {LICENSE_LABEL[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            className="flex h-10 w-full rounded-full border border-input bg-card px-4 text-sm text-foreground focus-visible:outline-none"
            {...register("priority")}
          >
            {DOCUMENT_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABEL[priority]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="topic">Topic (optional)</Label>
        <Input id="topic" {...register("topic")} />
      </div>

      <Controller
        control={control}
        name="relevantSections"
        render={({ field }) => (
          <TagListInput
            label="Relevant sections"
            helpText="Add each section name or number one at a time. Duplicate entries are prevented automatically."
            placeholder="e.g. Section 18C"
            values={field.value}
            onChange={field.onChange}
          />
        )}
      />

      <Controller
        control={control}
        name="tags"
        render={({ field }) => (
          <TagListInput
            label="Tags"
            helpText="Short keywords used for search and filtering."
            placeholder="e.g. discrimination"
            values={field.value}
            onChange={field.onChange}
          />
        )}
      />

      <Controller
        control={control}
        name="incidentTypeIds"
        render={({ field }) => (
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">Incident categories</legend>
            {incidentTypes === undefined ? (
              <p className="text-xs text-muted-foreground">Loading incident categories…</p>
            ) : incidentTypes.length === 0 ? (
              <p className="text-xs text-muted-foreground">No incident categories exist yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {incidentTypes.map((incidentType) => {
                  const checked = field.value.includes(incidentType.id);
                  return (
                    <label
                      key={incidentType.id}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          field.onChange(
                            event.target.checked
                              ? [...field.value, incidentType.id]
                              : field.value.filter((id: string) => id !== incidentType.id)
                          );
                        }}
                      />
                      {incidentType.name}
                      {incidentType.isDemo ? <span className="text-[10px] text-muted-foreground">(demo)</span> : null}
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>
        )}
      />
    </div>
  );
}
