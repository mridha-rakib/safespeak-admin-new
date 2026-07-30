"use client";

import { useFormContext } from "react-hook-form";

import { Input, Label } from "@/components/ui/input";
import { AUSTRALIAN_JURISDICTIONS } from "@/lib/jurisdictions";
import type { DocumentFormValues } from "@/lib/legislation/document-form-schema";
import { DOCUMENT_SOURCE_TYPES } from "@/lib/models/document";
import { cn } from "@/lib/utils";

const SOURCE_TYPE_LABEL: Record<(typeof DOCUMENT_SOURCE_TYPES)[number], string> = {
  legislation: "Legislation",
  regulation: "Regulation",
  policy: "Policy",
  guideline: "Guideline",
  case_law: "Case law",
  other: "Other",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

export function StepSource() {
  const {
    register,
    formState: { errors },
  } = useFormContext<DocumentFormValues>();

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title or legislation name</Label>
        <Input id="title" aria-invalid={Boolean(errors.title)} {...register("title")} />
        <FieldError message={errors.title?.message} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sourceType">Source type</Label>
          <select
            id="sourceType"
            aria-invalid={Boolean(errors.sourceType)}
            className={cn(
              "flex h-10 w-full rounded-full border border-input bg-card px-4 text-sm text-foreground focus-visible:outline-none"
            )}
            {...register("sourceType")}
          >
            {DOCUMENT_SOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {SOURCE_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
          <FieldError message={errors.sourceType?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sourceCategory">Source category</Label>
          <Input
            id="sourceCategory"
            placeholder="e.g. Federal legislation"
            aria-invalid={Boolean(errors.sourceCategory)}
            {...register("sourceCategory")}
          />
          <FieldError message={errors.sourceCategory?.message} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="authorityOrPublisher">Authority or publisher</Label>
          <Input
            id="authorityOrPublisher"
            placeholder="e.g. Demo Legal Reference Library"
            aria-invalid={Boolean(errors.authorityOrPublisher)}
            {...register("authorityOrPublisher")}
          />
          <p className="text-xs text-muted-foreground">Enter the real authority or publisher — this is never invented for you.</p>
          <FieldError message={errors.authorityOrPublisher?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="jurisdiction">Jurisdiction</Label>
          <select
            id="jurisdiction"
            aria-invalid={Boolean(errors.jurisdiction)}
            className="flex h-10 w-full rounded-full border border-input bg-card px-4 text-sm text-foreground focus-visible:outline-none"
            defaultValue=""
            {...register("jurisdiction")}
          >
            <option value="" disabled>
              Select a jurisdiction
            </option>
            {AUSTRALIAN_JURISDICTIONS.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>
          <FieldError message={errors.jurisdiction?.message} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="language">Language</Label>
          <Input id="language" aria-invalid={Boolean(errors.language)} {...register("language")} />
          <FieldError message={errors.language?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="actNumber">Act number (optional)</Label>
          <Input id="actNumber" {...register("actNumber")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="documentVersionLabel">Version (optional)</Label>
          <Input id="documentVersionLabel" {...register("documentVersionLabel")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sourceUrl">Source URL (optional)</Label>
        <Input
          id="sourceUrl"
          type="url"
          placeholder="https://…"
          aria-invalid={Boolean(errors.sourceUrl)}
          {...register("sourceUrl")}
        />
        <FieldError message={errors.sourceUrl?.message} />
      </div>
    </div>
  );
}
