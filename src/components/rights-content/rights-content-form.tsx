"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { RightsContentPreview } from "@/components/rights-content/rights-content-preview";
import { useAdminRepository } from "@/components/providers/repository-provider";
import { TagListInput } from "@/components/legislation/tag-list-input";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useCrudList } from "@/hooks/use-crud-list";
import { useTaxonomyDataBundle } from "@/hooks/use-taxonomy-data-bundle";
import { AUSTRALIAN_JURISDICTIONS } from "@/lib/jurisdictions";
import { createBaseFields, LOCAL_ADMIN_ACTOR, type ContentStatus } from "@/lib/models/base";
import { CONTENT_PRIORITIES, CONTENT_PRIORITY_LABEL } from "@/lib/models/content-common";
import { RIGHTS_CONTENT_TYPES, type RightsContent } from "@/lib/models/rights-content";
import { isSelectableForNewRelationship } from "@/lib/content/relationship-ids";
import { contentTypeRequiresLegalSource, getRightsContentBlockers } from "@/lib/rights-content/eligibility";
import { VersionConflictError } from "@/lib/repositories/errors";

const CONTENT_TYPE_LABEL: Record<(typeof RIGHTS_CONTENT_TYPES)[number], string> = {
  rights_overview: "Rights overview",
  reporting_rights: "Reporting rights",
  workplace_rights: "Workplace rights",
  housing_rights: "Housing rights",
  privacy_rights: "Privacy rights",
  discrimination_rights: "Discrimination rights",
  evidence_information: "Evidence information",
  support_access: "Support access",
  process_explanation: "Process explanation",
  other: "Other",
};

const selectClass = "h-10 w-full rounded-full border border-input bg-card px-4 text-sm text-foreground focus-visible:outline-none";

export function RightsContentForm({ initialRecord }: { initialRecord?: RightsContent | null }) {
  const { repository } = useAdminRepository();
  const router = useRouter();
  const dataBundle = useTaxonomyDataBundle();
  const incidentTypes = useCrudList((repo) => repo.incidentTypes) ?? [];

  const [record, setRecord] = useState<RightsContent | null>(initialRecord ?? null);
  const [title, setTitle] = useState(initialRecord?.title ?? "");
  const [summary, setSummary] = useState(initialRecord?.summary ?? "");
  const [body, setBody] = useState(initialRecord?.body ?? "");
  const [contentType, setContentType] = useState<RightsContent["contentType"]>(initialRecord?.contentType);
  const [tags, setTags] = useState<string[]>(initialRecord?.tags ?? []);
  const [jurisdiction, setJurisdiction] = useState<RightsContent["jurisdiction"]>(initialRecord?.jurisdiction);
  const [priority, setPriority] = useState<RightsContent["priority"]>(initialRecord?.priority ?? "normal");
  const [reviewDueDate, setReviewDueDate] = useState(initialRecord?.reviewDueDate ?? "");
  const [effectiveFromDate, setEffectiveFromDate] = useState(initialRecord?.effectiveFromDate ?? "");
  const [resourceCategoryIds, setResourceCategoryIds] = useState<string[]>(initialRecord?.resourceCategoryIds ?? []);
  const [incidentTypeIds, setIncidentTypeIds] = useState<string[]>(initialRecord?.incidentTypeIds ?? []);
  const [relatedLegislationIds, setRelatedLegislationIds] = useState<string[]>(initialRecord?.relatedLegislationIds ?? []);
  const [relatedSupportOrganisationIds, setRelatedSupportOrganisationIds] = useState<string[]>(
    initialRecord?.relatedSupportOrganisationIds ?? []
  );
  const [sourceNotes, setSourceNotes] = useState(initialRecord?.sourceNotes ?? "");
  const [publicDisclaimer, setPublicDisclaimer] = useState(initialRecord?.publicDisclaimer ?? "");
  const [internalNotes, setInternalNotes] = useState(initialRecord?.internalNotes ?? "");

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (isDirty) event.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  function handleCancel() {
    if (isDirty) setCancelConfirmOpen(true);
    else router.push("/content/rights-legal-information");
  }

  function markDirty<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setIsDirty(true);
    };
  }

  const requiresDisclaimer = contentTypeRequiresLegalSource(contentType);

  async function handleSave(target: ContentStatus) {
    if (!repository || isSaving) return;
    setError(null);
    setIsSaving(true);

    try {
      const fields = {
        title: title.trim(),
        summary: summary.trim(),
        body: body.trim() || undefined,
        contentType,
        tags,
        jurisdiction,
        priority,
        reviewDueDate: reviewDueDate || undefined,
        effectiveFromDate: effectiveFromDate || undefined,
        resourceCategoryIds,
        incidentTypeIds,
        relatedLegislationIds,
        relatedSupportOrganisationIds,
        sourceNotes: sourceNotes.trim() || undefined,
        publicDisclaimer: publicDisclaimer.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
      };

      let saved: RightsContent;
      if (!record) {
        const draft: RightsContent = { ...createBaseFields({ status: target }), ...fields };
        saved = await repository.rightsContent.create(draft);
      } else {
        saved = await repository.rightsContent.updateWithVersionCheck(record.id, fields, record.version, LOCAL_ADMIN_ACTOR);
      }

      if (saved.status !== target) {
        saved = await repository.rightsContent.transitionStatus(saved.id, target, LOCAL_ADMIN_ACTOR);
      }

      setRecord(saved);
      setIsDirty(false);
      router.push(`/content/rights-legal-information/${saved.id}` as Route);
    } catch (err) {
      if (err instanceof VersionConflictError) setError(err.message);
      else setError("Something went wrong while saving. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const previewRecord: RightsContent = {
    ...(record ?? createBaseFields({ status: "draft" })),
    title: title.trim(),
    summary: summary.trim(),
    body: body.trim() || undefined,
    contentType,
    tags,
    jurisdiction,
    priority,
    reviewDueDate: reviewDueDate || undefined,
    effectiveFromDate: effectiveFromDate || undefined,
    resourceCategoryIds,
    incidentTypeIds,
    relatedLegislationIds,
    relatedSupportOrganisationIds,
    sourceNotes: sourceNotes.trim() || undefined,
    publicDisclaimer: publicDisclaimer.trim() || undefined,
    internalNotes: internalNotes.trim() || undefined,
  } as RightsContent;

  const blockers = dataBundle ? getRightsContentBlockers(previewRecord, dataBundle) : ["Loading related records…"];

  const selectableDocuments = (dataBundle?.documents ?? []).filter(
    (d) => isSelectableForNewRelationship(d.status) || relatedLegislationIds.includes(d.id)
  );
  const selectableOrgs = (dataBundle?.supportOrganisations ?? []).filter(
    (o) => isSelectableForNewRelationship(o.status) || relatedSupportOrganisationIds.includes(o.id)
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        {error ? (
          <Alert tone="destructive" title="This record could not be saved" role="alert">
            {error}
          </Alert>
        ) : null}

        {/* Section A: Core content */}
        <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Core content</h2>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(event) => markDirty(setTitle)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="summary">Short summary</Label>
            <Textarea id="summary" rows={2} value={summary} onChange={(event) => markDirty(setSummary)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body">Full content</Label>
            <Textarea id="body" rows={6} value={body} onChange={(event) => markDirty(setBody)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contentType">Content type</Label>
            <select
              id="contentType"
              className={selectClass}
              value={contentType ?? ""}
              onChange={(event) => markDirty(setContentType)((event.target.value || undefined) as RightsContent["contentType"])}
            >
              <option value="">Not set</option>
              {RIGHTS_CONTENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CONTENT_TYPE_LABEL[type]}
                </option>
              ))}
            </select>
            {requiresDisclaimer ? (
              <p className="text-xs text-warning">This content type describes a legal right and needs a governed legislation source and a public disclaimer before publish.</p>
            ) : null}
          </div>
          <TagListInput label="Tags" placeholder="e.g. privacy" values={tags} onChange={markDirty(setTags)} />
        </section>

        {/* Section B: Classification & relationships */}
        <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Classification &amp; relationships</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="jurisdiction">Jurisdiction</Label>
              <select
                id="jurisdiction"
                className={selectClass}
                value={jurisdiction ?? ""}
                onChange={(event) => markDirty(setJurisdiction)((event.target.value || undefined) as RightsContent["jurisdiction"])}
              >
                <option value="">Not set</option>
                {AUSTRALIAN_JURISDICTIONS.map((j) => (
                  <option key={j.value} value={j.value}>
                    {j.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                className={selectClass}
                value={priority}
                onChange={(event) => markDirty(setPriority)(event.target.value as RightsContent["priority"])}
              >
                {CONTENT_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {CONTENT_PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">Resource categories (at least one required)</legend>
            {(dataBundle?.resourceCategories ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No resource categories exist yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(dataBundle?.resourceCategories ?? []).map((category) => {
                  const checked = resourceCategoryIds.includes(category.id);
                  return (
                    <label key={category.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          markDirty(setResourceCategoryIds)(
                            event.target.checked
                              ? [...resourceCategoryIds, category.id]
                              : resourceCategoryIds.filter((id) => id !== category.id)
                          )
                        }
                      />
                      {category.name}
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">Incident categories (optional)</legend>
            {incidentTypes.length === 0 ? (
              <p className="text-xs text-muted-foreground">No incident categories exist yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {incidentTypes.map((incidentType) => {
                  const checked = incidentTypeIds.includes(incidentType.id);
                  return (
                    <label key={incidentType.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          markDirty(setIncidentTypeIds)(
                            event.target.checked
                              ? [...incidentTypeIds, incidentType.id]
                              : incidentTypeIds.filter((id) => id !== incidentType.id)
                          )
                        }
                      />
                      {incidentType.name}
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">
              Related legislation {requiresDisclaimer ? "(at least one published, legal-review-complete source required)" : "(optional)"}
            </legend>
            {selectableDocuments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No published Knowledge &amp; Legislation documents are available yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectableDocuments.map((doc) => {
                  const checked = relatedLegislationIds.includes(doc.id);
                  return (
                    <label key={doc.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          markDirty(setRelatedLegislationIds)(
                            event.target.checked ? [...relatedLegislationIds, doc.id] : relatedLegislationIds.filter((id) => id !== doc.id)
                          )
                        }
                      />
                      {doc.title}
                      {doc.status === "published" && doc.legalReviewComplete ? <span className="text-[10px] text-success">(governed)</span> : null}
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">Related support organisations (optional)</legend>
            {selectableOrgs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No support organisations are available yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectableOrgs.map((org) => {
                  const checked = relatedSupportOrganisationIds.includes(org.id);
                  return (
                    <label key={org.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          markDirty(setRelatedSupportOrganisationIds)(
                            event.target.checked
                              ? [...relatedSupportOrganisationIds, org.id]
                              : relatedSupportOrganisationIds.filter((id) => id !== org.id)
                          )
                        }
                      />
                      {org.name}
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>
        </section>

        {/* Section C: Legal source & publishing */}
        <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Legal source &amp; publishing</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="effectiveFromDate">Effective from (optional)</Label>
              <Input id="effectiveFromDate" type="date" value={effectiveFromDate} onChange={(event) => markDirty(setEffectiveFromDate)(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reviewDueDate">Review due date</Label>
              <Input id="reviewDueDate" type="date" value={reviewDueDate} onChange={(event) => markDirty(setReviewDueDate)(event.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sourceNotes">Source notes (optional, internal)</Label>
            <Textarea id="sourceNotes" rows={2} value={sourceNotes} onChange={(event) => markDirty(setSourceNotes)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="publicDisclaimer">
              Public disclaimer {requiresDisclaimer ? "(required before publish)" : "(optional)"}
            </Label>
            <Textarea
              id="publicDisclaimer"
              rows={3}
              value={publicDisclaimer}
              onChange={(event) => markDirty(setPublicDisclaimer)(event.target.value)}
              placeholder="This information is general and educational only — it is not personalised legal advice."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="internalNotes">Internal notes (optional, never exported)</Label>
            <Textarea id="internalNotes" rows={3} value={internalNotes} onChange={(event) => markDirty(setInternalNotes)(event.target.value)} />
          </div>
        </section>

        {blockers.length > 0 ? (
          <div role="status" className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
            <p className="font-semibold">Ready for review / Publish are not available yet:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
              {blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={isSaving} onClick={() => handleSave("draft")}>
              Save as draft
            </Button>
            <Button variant="secondary" disabled={isSaving || blockers.length > 0} onClick={() => handleSave("ready_for_review")}>
              Mark ready for review
            </Button>
            <Button disabled={isSaving || blockers.length > 0} onClick={() => handleSave("published")}>
              Publish
            </Button>
          </div>
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">User-facing preview</p>
        <RightsContentPreview record={previewRecord} />
      </div>

      <Dialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>Leaving now will discard your unsaved changes to this record.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelConfirmOpen(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={() => router.push("/content/rights-legal-information")}>
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
