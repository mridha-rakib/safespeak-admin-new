"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { MicrocardPreview } from "@/components/microcards/microcard-preview";
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
import { getMicrocardBlockers } from "@/lib/microcards/eligibility";
import { createBaseFields, LOCAL_ADMIN_ACTOR, type ContentStatus } from "@/lib/models/base";
import { CONTENT_PRIORITIES, CONTENT_PRIORITY_LABEL } from "@/lib/models/content-common";
import { MICROCARD_CARD_TYPES, type Microcard } from "@/lib/models/microcard";
import { MICROCARD_CTA_TYPE_LABEL, MICROCARD_CTA_TYPES, MICROCARD_INTERNAL_ROUTES, type MicrocardCta, type MicrocardCtaType } from "@/lib/models/microcard-cta";
import { isSelectableForNewRelationship } from "@/lib/content/relationship-ids";
import { VersionConflictError } from "@/lib/repositories/errors";

const CARD_TYPE_LABEL: Record<(typeof MICROCARD_CARD_TYPES)[number], string> = {
  quick_guidance: "Quick guidance",
  safety_tip: "Safety tip",
  rights_summary: "Rights summary",
  next_step: "Next step",
  evidence_tip: "Evidence tip",
  support_option: "Support option",
  preparation_tip: "Preparation tip",
  other: "Other",
};

const selectClass = "h-10 w-full rounded-full border border-input bg-card px-4 text-sm text-foreground focus-visible:outline-none";

export function MicrocardForm({ initialRecord }: { initialRecord?: Microcard | null }) {
  const { repository } = useAdminRepository();
  const router = useRouter();
  const dataBundle = useTaxonomyDataBundle();
  const incidentTypes = useCrudList((repo) => repo.incidentTypes) ?? [];

  const [record, setRecord] = useState<Microcard | null>(initialRecord ?? null);
  const [title, setTitle] = useState(initialRecord?.title ?? "");
  const [summary, setSummary] = useState(initialRecord?.summary ?? "");
  const [body, setBody] = useState(initialRecord?.body ?? "");
  const [topic, setTopic] = useState(initialRecord?.topic ?? "");
  const [tags, setTags] = useState<string[]>(initialRecord?.tags ?? []);
  const [cardType, setCardType] = useState<Microcard["cardType"]>(initialRecord?.cardType);
  const [jurisdiction, setJurisdiction] = useState<Microcard["jurisdiction"]>(initialRecord?.jurisdiction);
  const [priority, setPriority] = useState<Microcard["priority"]>(initialRecord?.priority ?? "normal");
  const [displayOrder, setDisplayOrder] = useState(initialRecord?.displayOrder ?? 0);
  const [reviewDueDate, setReviewDueDate] = useState(initialRecord?.reviewDueDate ?? "");
  const [resourceCategoryId, setResourceCategoryId] = useState(initialRecord?.resourceCategoryId ?? "");
  const [incidentTypeIds, setIncidentTypeIds] = useState<string[]>(initialRecord?.incidentTypeIds ?? []);
  const [relatedLegislationIds, setRelatedLegislationIds] = useState<string[]>(initialRecord?.relatedLegislationIds ?? []);
  const [relatedSupportOrganisationIds, setRelatedSupportOrganisationIds] = useState<string[]>(
    initialRecord?.relatedSupportOrganisationIds ?? []
  );
  const [cta, setCta] = useState<MicrocardCta>(initialRecord?.cta ?? { type: "none" });
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
    else router.push("/content/microcards");
  }

  function markDirty<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setIsDirty(true);
    };
  }

  async function handleSave(target: ContentStatus) {
    if (!repository || isSaving) return;
    setError(null);
    setIsSaving(true);

    try {
      const fields = {
        title: title.trim(),
        summary: summary.trim(),
        body: body.trim() || undefined,
        topic: topic.trim() || undefined,
        tags,
        cardType,
        resourceCategoryId: resourceCategoryId || undefined,
        jurisdiction,
        priority,
        displayOrder,
        reviewDueDate: reviewDueDate || undefined,
        incidentTypeIds,
        relatedLegislationIds,
        relatedSupportOrganisationIds,
        cta,
        internalNotes: internalNotes.trim() || undefined,
      };

      let saved: Microcard;
      if (!record) {
        const draft: Microcard = { ...createBaseFields({ status: target }), ...fields };
        saved = await repository.microcards.create(draft);
      } else {
        saved = await repository.microcards.updateWithVersionCheck(record.id, fields, record.version, LOCAL_ADMIN_ACTOR);
      }

      if (saved.status !== target) {
        saved = await repository.microcards.transitionStatus(saved.id, target, LOCAL_ADMIN_ACTOR);
      }

      setRecord(saved);
      setIsDirty(false);
      router.push(`/content/microcards/${saved.id}` as Route);
    } catch (err) {
      if (err instanceof VersionConflictError) setError(err.message);
      else setError("Something went wrong while saving. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const previewRecord: Microcard = {
    ...(record ?? createBaseFields({ status: "draft" })),
    title: title.trim(),
    summary: summary.trim(),
    body: body.trim() || undefined,
    topic: topic.trim() || undefined,
    tags,
    cardType,
    resourceCategoryId: resourceCategoryId || undefined,
    jurisdiction,
    priority,
    displayOrder,
    reviewDueDate: reviewDueDate || undefined,
    incidentTypeIds,
    relatedLegislationIds,
    relatedSupportOrganisationIds,
    cta,
    internalNotes: internalNotes.trim() || undefined,
  } as Microcard;

  const blockers = dataBundle ? getMicrocardBlockers(previewRecord, dataBundle) : ["Loading related records…"];

  const selectableRightsContent = (dataBundle?.rightsContent ?? []).filter(
    (r) => isSelectableForNewRelationship(r.status) || r.id === cta.target
  );
  const selectableDocuments = (dataBundle?.documents ?? []).filter(
    (d) => isSelectableForNewRelationship(d.status) || d.id === cta.target
  );
  const selectableOrgs = (dataBundle?.supportOrganisations ?? []).filter(
    (o) => isSelectableForNewRelationship(o.status) || o.id === cta.target
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
            <Label htmlFor="summary">Short guidance</Label>
            <Textarea id="summary" rows={2} value={summary} onChange={(event) => markDirty(setSummary)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body">Full content</Label>
            <Textarea id="body" rows={6} value={body} onChange={(event) => markDirty(setBody)(event.target.value)} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cardType">Card type</Label>
              <select
                id="cardType"
                className={selectClass}
                value={cardType ?? ""}
                onChange={(event) => markDirty(setCardType)((event.target.value || undefined) as Microcard["cardType"])}
              >
                <option value="">Not set</option>
                {MICROCARD_CARD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CARD_TYPE_LABEL[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topic">Topic (optional, legacy)</Label>
              <Input id="topic" value={topic} onChange={(event) => markDirty(setTopic)(event.target.value)} />
            </div>
          </div>
          <TagListInput label="Tags" placeholder="e.g. safety" values={tags} onChange={markDirty(setTags)} />
        </section>

        {/* Section B: Classification & relationships */}
        <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Classification &amp; relationships</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="jurisdiction">Jurisdiction</Label>
              <select
                id="jurisdiction"
                className={selectClass}
                value={jurisdiction ?? ""}
                onChange={(event) => markDirty(setJurisdiction)((event.target.value || undefined) as Microcard["jurisdiction"])}
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
                onChange={(event) => markDirty(setPriority)(event.target.value as Microcard["priority"])}
              >
                {CONTENT_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {CONTENT_PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="displayOrder">Display order</Label>
              <Input
                id="displayOrder"
                type="number"
                min={0}
                value={displayOrder}
                onChange={(event) => markDirty(setDisplayOrder)(Math.max(0, Number(event.target.value) || 0))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resourceCategoryId">Resource category</Label>
            <select
              id="resourceCategoryId"
              className={selectClass}
              value={resourceCategoryId}
              onChange={(event) => markDirty(setResourceCategoryId)(event.target.value)}
            >
              <option value="">Not set</option>
              {(dataBundle?.resourceCategories ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

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
            <legend className="text-sm font-semibold text-foreground">Related legislation (optional)</legend>
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

        {/* Section C: Call to action */}
        <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Call to action (optional)</h2>
          <div className="space-y-1.5">
            <Label htmlFor="ctaType">Call-to-action type</Label>
            <select
              id="ctaType"
              className={selectClass}
              value={cta.type}
              onChange={(event) => markDirty(setCta)({ type: event.target.value as MicrocardCtaType, label: cta.label, target: undefined })}
            >
              {MICROCARD_CTA_TYPES.map((type) => (
                <option key={type} value={type}>
                  {MICROCARD_CTA_TYPE_LABEL[type]}
                </option>
              ))}
            </select>
          </div>

          {cta.type !== "none" && cta.type !== "start_report" ? (
            <div className="space-y-1.5">
              <Label htmlFor="ctaLabel">Button label (optional)</Label>
              <Input
                id="ctaLabel"
                value={cta.label ?? ""}
                onChange={(event) => markDirty(setCta)({ ...cta, label: event.target.value || undefined })}
              />
            </div>
          ) : null}

          {cta.type === "view_rights_information" ? (
            <div className="space-y-1.5">
              <Label htmlFor="ctaTarget">Rights &amp; Legal Information target</Label>
              <select id="ctaTarget" className={selectClass} value={cta.target ?? ""} onChange={(event) => markDirty(setCta)({ ...cta, target: event.target.value || undefined })}>
                <option value="">Choose a record</option>
                {selectableRightsContent.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {cta.type === "view_legislation_source" ? (
            <div className="space-y-1.5">
              <Label htmlFor="ctaTarget">Legislation source target</Label>
              <select id="ctaTarget" className={selectClass} value={cta.target ?? ""} onChange={(event) => markDirty(setCta)({ ...cta, target: event.target.value || undefined })}>
                <option value="">Choose a record</option>
                {selectableDocuments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {cta.type === "view_support_service" ? (
            <div className="space-y-1.5">
              <Label htmlFor="ctaTarget">Support service target</Label>
              <select id="ctaTarget" className={selectClass} value={cta.target ?? ""} onChange={(event) => markDirty(setCta)({ ...cta, target: event.target.value || undefined })}>
                <option value="">Choose a record</option>
                {selectableOrgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {cta.type === "open_internal_route" ? (
            <div className="space-y-1.5">
              <Label htmlFor="ctaTarget">Internal page</Label>
              <select id="ctaTarget" className={selectClass} value={cta.target ?? ""} onChange={(event) => markDirty(setCta)({ ...cta, target: event.target.value || undefined })}>
                <option value="">Choose a page</option>
                {MICROCARD_INTERNAL_ROUTES.map((route) => (
                  <option key={route} value={route}>
                    {route}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {cta.type === "open_safe_external_link" ? (
            <div className="space-y-1.5">
              <Label htmlFor="ctaTarget">External link (must start with https://)</Label>
              <Input
                id="ctaTarget"
                value={cta.target ?? ""}
                placeholder="https://example.org"
                onChange={(event) => markDirty(setCta)({ ...cta, target: event.target.value || undefined })}
              />
            </div>
          ) : null}
        </section>

        {/* Section D: Publishing */}
        <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Publishing</h2>
          <div className="space-y-1.5">
            <Label htmlFor="reviewDueDate">Review due date</Label>
            <Input id="reviewDueDate" type="date" value={reviewDueDate} onChange={(event) => markDirty(setReviewDueDate)(event.target.value)} />
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
        <MicrocardPreview record={previewRecord} />
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
            <Button variant="destructive" onClick={() => router.push("/content/microcards")}>
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
