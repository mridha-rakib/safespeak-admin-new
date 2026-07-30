"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAdminRepository } from "@/components/providers/repository-provider";
import { TagListInput } from "@/components/legislation/tag-list-input";
import { MachineKeyField } from "@/components/taxonomy/machine-key-field";
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
import { isSelectableForNewRelationship } from "@/lib/content/relationship-ids";
import { AUSTRALIAN_JURISDICTIONS } from "@/lib/jurisdictions";
import { getMatchingRuleBlockers } from "@/lib/matching-rules/eligibility";
import { ASSISTANT_TOPIC_KEYS, ASSISTANT_TOPIC_LABEL } from "@/lib/models/assistant-topic";
import { createBaseFields, LOCAL_ADMIN_ACTOR, type ContentStatus } from "@/lib/models/base";
import { type MatchingRule } from "@/lib/models/matching-rule";
import { TRIAGE_URGENCY_LEVELS, type TriageUrgencyLevel } from "@/lib/models/triage-label";
import { isValidMachineKey, MACHINE_KEY_HELP_TEXT, normalizeMachineKeyInput, suggestMachineKeyFromName } from "@/lib/taxonomy/machine-key";
import { isDuplicateMachineKey } from "@/lib/taxonomy/validation";
import { VersionConflictError } from "@/lib/repositories/errors";

const URGENCY_LABEL: Record<TriageUrgencyLevel, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  critical: "Critical",
};

/** How many of `ids` point at a record that exists but is no longer `published` — used to keep an existing selection visible with a plain warning rather than silently dropping it. See lib/content/relationship-ids.ts. */
function unpublishedSelectedCount(ids: string[], records: { id: string; status: string }[]): number {
  return ids.filter((id) => {
    const record = records.find((r) => r.id === id);
    return record ? record.status !== "published" : false;
  }).length;
}

export function MatchingRuleForm({ mode, initialRecord }: { mode: "create" | "edit"; initialRecord?: MatchingRule | null }) {
  const { repository } = useAdminRepository();
  const router = useRouter();
  const dataBundle = useTaxonomyDataBundle();
  const existingRules = useCrudList((repo) => repo.matchingRules) ?? [];

  const [record, setRecord] = useState<MatchingRule | null>(initialRecord ?? null);
  const [name, setName] = useState(initialRecord?.name ?? "");
  const [machineKey, setMachineKey] = useState(initialRecord?.machineKey ?? "");
  const [machineKeyTouched, setMachineKeyTouched] = useState(mode === "edit");
  const [description, setDescription] = useState(initialRecord?.description ?? "");
  const [priority, setPriority] = useState(initialRecord?.priority ?? 0);
  const [enabled, setEnabled] = useState(initialRecord?.enabled ?? true);

  const [topicKeys, setTopicKeys] = useState<MatchingRule["topicKeys"]>(initialRecord?.topicKeys ?? []);
  const [incidentTypeIds, setIncidentTypeIds] = useState<string[]>(initialRecord?.incidentTypeIds ?? []);
  const [triageLabelIds, setTriageLabelIds] = useState<string[]>(initialRecord?.triageLabelIds ?? []);
  const [resourceCategoryIds, setResourceCategoryIds] = useState<string[]>(initialRecord?.resourceCategoryIds ?? []);
  const [jurisdictions, setJurisdictions] = useState<MatchingRule["jurisdictions"]>(initialRecord?.jurisdictions ?? []);
  const [urgencyLevels, setUrgencyLevels] = useState<MatchingRule["urgencyLevels"]>(initialRecord?.urgencyLevels ?? []);
  const [supportNeeds, setSupportNeeds] = useState<string[]>(initialRecord?.supportNeeds ?? []);

  const [legislationIds, setLegislationIds] = useState<string[]>(initialRecord?.legislationIds ?? []);
  const [microcardIds, setMicrocardIds] = useState<string[]>(initialRecord?.microcardIds ?? []);
  const [rightsContentIds, setRightsContentIds] = useState<string[]>(initialRecord?.rightsContentIds ?? []);
  const [supportOrganisationIds, setSupportOrganisationIds] = useState<string[]>(initialRecord?.supportOrganisationIds ?? []);
  const [supportProfessionalIds, setSupportProfessionalIds] = useState<string[]>(initialRecord?.supportProfessionalIds ?? []);
  const [reportingDestinationIds, setReportingDestinationIds] = useState<string[]>(initialRecord?.reportingDestinationIds ?? []);

  const [reviewDueDate, setReviewDueDate] = useState(initialRecord?.reviewDueDate ?? "");
  const [internalNotes, setInternalNotes] = useState(initialRecord?.internalNotes ?? "");

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  useEffect(() => {
    if (mode === "create" && !machineKeyTouched) {
      setMachineKey(suggestMachineKeyFromName(name));
    }
  }, [name, mode, machineKeyTouched]);

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
    else router.push("/taxonomy/matching-rules");
  }

  function markDirty<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setIsDirty(true);
    };
  }

  function toggleInArray<T>(current: T[], value: T, checked: boolean): T[] {
    return checked ? [...current, value] : current.filter((v) => v !== value);
  }

  async function handleSave(target: ContentStatus) {
    if (!repository || isSaving) return;
    setError(null);

    const normalizedKey = normalizeMachineKeyInput(machineKey);
    if (mode === "create") {
      if (!isValidMachineKey(normalizedKey)) {
        setKeyError(`Enter a valid stable key. ${MACHINE_KEY_HELP_TEXT}`);
        return;
      }
      if (isDuplicateMachineKey(normalizedKey, existingRules)) {
        setKeyError("This stable key is already used by another matching rule.");
        return;
      }
    }
    setKeyError(null);
    setIsSaving(true);

    try {
      const fields = {
        name: name.trim(),
        description: description.trim() || undefined,
        priority,
        enabled,
        topicKeys,
        incidentTypeIds,
        triageLabelIds,
        resourceCategoryIds,
        jurisdictions,
        urgencyLevels,
        supportNeeds,
        legislationIds,
        microcardIds,
        rightsContentIds,
        supportOrganisationIds,
        supportProfessionalIds,
        reportingDestinationIds,
        reviewDueDate: reviewDueDate || undefined,
        internalNotes: internalNotes.trim() || undefined,
      };

      let saved: MatchingRule;
      if (!record) {
        // A brand-new record has no prior status to transition from, so it is
        // created directly at `target` — mirrors resource-category-form.tsx.
        const draft: MatchingRule = {
          ...createBaseFields({ status: target }),
          machineKey: normalizedKey,
          ...fields,
        };
        saved = await repository.matchingRules.create(draft);
      } else {
        saved = await repository.matchingRules.updateWithVersionCheck(record.id, fields, record.version, LOCAL_ADMIN_ACTOR);
      }

      if (saved.status !== target) {
        saved = await repository.matchingRules.transitionStatus(saved.id, target, LOCAL_ADMIN_ACTOR);
      }

      setRecord(saved);
      setIsDirty(false);
      router.push(`/taxonomy/matching-rules/${saved.id}` as Route);
    } catch (err) {
      if (err instanceof VersionConflictError) setError(err.message);
      else setError("Something went wrong while saving. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const previewRecord: MatchingRule = {
    ...(record ?? { ...createBaseFields({ status: "draft" }), machineKey: normalizeMachineKeyInput(machineKey) }),
    name: name.trim(),
    machineKey: normalizeMachineKeyInput(machineKey),
    description: description.trim() || undefined,
    priority,
    enabled,
    topicKeys,
    incidentTypeIds,
    triageLabelIds,
    resourceCategoryIds,
    jurisdictions,
    urgencyLevels,
    supportNeeds,
    legislationIds,
    microcardIds,
    rightsContentIds,
    supportOrganisationIds,
    supportProfessionalIds,
    reportingDestinationIds,
    reviewDueDate: reviewDueDate || undefined,
    internalNotes: internalNotes.trim() || undefined,
  } as MatchingRule;

  const blockers = dataBundle ? getMatchingRuleBlockers(previewRecord, dataBundle) : ["Loading related records…"];

  const selectableMicrocards = (dataBundle?.microcards ?? []).filter(
    (m) => isSelectableForNewRelationship(m.status) || microcardIds.includes(m.id)
  );
  const selectableRightsContent = (dataBundle?.rightsContent ?? []).filter(
    (r) => isSelectableForNewRelationship(r.status) || rightsContentIds.includes(r.id)
  );
  const selectableOrgs = (dataBundle?.supportOrganisations ?? []).filter(
    (o) => isSelectableForNewRelationship(o.status) || supportOrganisationIds.includes(o.id)
  );
  const selectableProfessionals = (dataBundle?.supportProfessionals ?? []).filter(
    (p) => isSelectableForNewRelationship(p.status) || supportProfessionalIds.includes(p.id)
  );
  const selectableDestinations = (dataBundle?.reportingDestinations ?? []).filter(
    (d) => isSelectableForNewRelationship(d.status) || reportingDestinationIds.includes(d.id)
  );
  const selectableDocuments = (dataBundle?.documents ?? []).filter(
    (d) => isSelectableForNewRelationship(d.status) || legislationIds.includes(d.id)
  );

  return (
    <div className="space-y-6">
      {error ? (
        <Alert tone="destructive" title="This record could not be saved" role="alert">
          {error}
        </Alert>
      ) : null}

      {/* Section A: Rule identity */}
      <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-foreground">Rule identity</h2>
        <div className="space-y-1.5">
          <Label htmlFor="name">Rule name</Label>
          <Input id="name" value={name} onChange={(event) => markDirty(setName)(event.target.value)} />
        </div>

        <MachineKeyField
          value={machineKey}
          locked={mode === "edit"}
          error={keyError ?? undefined}
          onChange={(next) => {
            setMachineKey(next);
            setMachineKeyTouched(true);
            setIsDirty(true);
          }}
        />

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={3} value={description} onChange={(event) => markDirty(setDescription)(event.target.value)} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="priority">Priority (lower number = higher precedence)</Label>
            <Input
              id="priority"
              type="number"
              value={priority}
              onChange={(event) => markDirty(setPriority)(Math.trunc(Number(event.target.value) || 0))}
            />
          </div>
          <div className="flex items-end pb-2.5">
            <label className="inline-flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={enabled} onChange={(event) => markDirty(setEnabled)(event.target.checked)} />
              Enabled (the matching engine only executes published AND enabled rules)
            </label>
          </div>
        </div>
      </section>

      {/* Section B: Match conditions */}
      <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-foreground">Match conditions</h2>
        <p className="text-xs text-muted-foreground">
          Leaving a condition empty means it acts as a wildcard — it never blocks a match on that dimension. At least one
          condition (or support need) is required before this rule can be marked ready for review or published.
        </p>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-foreground">Assistant topics (empty = any topic)</legend>
          <div className="flex flex-wrap gap-2">
            {ASSISTANT_TOPIC_KEYS.map((key) => {
              const checked = topicKeys.includes(key);
              return (
                <label key={key} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => markDirty(setTopicKeys)(toggleInArray(topicKeys, key, event.target.checked))}
                  />
                  {ASSISTANT_TOPIC_LABEL[key]}
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-foreground">Incident types (empty = any)</legend>
          {(dataBundle?.incidentTypes ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No incident types exist yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(dataBundle?.incidentTypes ?? []).map((incidentType) => {
                const checked = incidentTypeIds.includes(incidentType.id);
                return (
                  <label key={incidentType.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => markDirty(setIncidentTypeIds)(toggleInArray(incidentTypeIds, incidentType.id, event.target.checked))}
                    />
                    {incidentType.name}
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-foreground">Triage labels (empty = any)</legend>
          {(dataBundle?.triageLabels ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No triage labels exist yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(dataBundle?.triageLabels ?? []).map((label) => {
                const checked = triageLabelIds.includes(label.id);
                return (
                  <label key={label.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => markDirty(setTriageLabelIds)(toggleInArray(triageLabelIds, label.id, event.target.checked))}
                    />
                    {label.name}
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-foreground">Resource categories (empty = any)</legend>
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
                      onChange={(event) => markDirty(setResourceCategoryIds)(toggleInArray(resourceCategoryIds, category.id, event.target.checked))}
                    />
                    {category.name}
                  </label>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Editorial grouping only — the mock matching engine has no resource-category field on its incident context, so this
            dimension is never evaluated at match time (see lib/matching-rules/engine.ts).
          </p>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-foreground">Jurisdictions (empty = Australia-wide)</legend>
          <div className="flex flex-wrap gap-2">
            {AUSTRALIAN_JURISDICTIONS.map((j) => {
              const checked = jurisdictions.includes(j.value);
              return (
                <label key={j.value} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => markDirty(setJurisdictions)(toggleInArray(jurisdictions, j.value, event.target.checked))}
                  />
                  {j.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-foreground">Urgency levels (empty = any)</legend>
          <div className="flex flex-wrap gap-2">
            {TRIAGE_URGENCY_LEVELS.map((level) => {
              const checked = urgencyLevels.includes(level);
              return (
                <label key={level} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => markDirty(setUrgencyLevels)(toggleInArray(urgencyLevels, level, event.target.checked))}
                  />
                  {URGENCY_LABEL[level]}
                </label>
              );
            })}
          </div>
        </fieldset>

        <TagListInput
          label="Support needs (free text, empty = any)"
          helpText="A lightweight matching hint, not a governed taxonomy — see the matching-rule model's own doc comment."
          placeholder="e.g. housing"
          values={supportNeeds}
          onChange={markDirty(setSupportNeeds)}
        />
      </section>

      {/* Section C: Recommended content */}
      <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-foreground">Recommended content</h2>
        <p className="text-xs text-muted-foreground">
          At least one recommendation is required before this rule can be marked ready for review or published. Only
          published records can be newly selected — an existing selection that is no longer published stays visible below
          with a warning rather than being silently removed.
        </p>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-foreground">Microcards</legend>
          {selectableMicrocards.length === 0 ? (
            <p className="text-xs text-muted-foreground">No published microcards are available yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectableMicrocards.map((card) => {
                const checked = microcardIds.includes(card.id);
                return (
                  <label key={card.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => markDirty(setMicrocardIds)(toggleInArray(microcardIds, card.id, event.target.checked))}
                    />
                    {card.title}
                    {card.status !== "published" ? <span className="text-[10px] text-warning">(not published)</span> : null}
                  </label>
                );
              })}
            </div>
          )}
          {unpublishedSelectedCount(microcardIds, dataBundle?.microcards ?? []) > 0 ? (
            <p className="text-xs text-warning">
              {unpublishedSelectedCount(microcardIds, dataBundle?.microcards ?? [])} selected microcard(s) are no longer
              published and will block Ready for review / Publish until removed or republished.
            </p>
          ) : null}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-foreground">Rights &amp; legal information</legend>
          {selectableRightsContent.length === 0 ? (
            <p className="text-xs text-muted-foreground">No published rights content is available yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectableRightsContent.map((item) => {
                const checked = rightsContentIds.includes(item.id);
                return (
                  <label key={item.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => markDirty(setRightsContentIds)(toggleInArray(rightsContentIds, item.id, event.target.checked))}
                    />
                    {item.title}
                    {item.status !== "published" ? <span className="text-[10px] text-warning">(not published)</span> : null}
                  </label>
                );
              })}
            </div>
          )}
          {unpublishedSelectedCount(rightsContentIds, dataBundle?.rightsContent ?? []) > 0 ? (
            <p className="text-xs text-warning">
              {unpublishedSelectedCount(rightsContentIds, dataBundle?.rightsContent ?? [])} selected rights content record(s)
              are no longer published and will block Ready for review / Publish until removed or republished.
            </p>
          ) : null}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-foreground">Support organisations</legend>
          {selectableOrgs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No published support organisations are available yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectableOrgs.map((org) => {
                const checked = supportOrganisationIds.includes(org.id);
                return (
                  <label key={org.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => markDirty(setSupportOrganisationIds)(toggleInArray(supportOrganisationIds, org.id, event.target.checked))}
                    />
                    {org.name}
                    {org.status !== "published" ? <span className="text-[10px] text-warning">(not published)</span> : null}
                  </label>
                );
              })}
            </div>
          )}
          {unpublishedSelectedCount(supportOrganisationIds, dataBundle?.supportOrganisations ?? []) > 0 ? (
            <p className="text-xs text-warning">
              {unpublishedSelectedCount(supportOrganisationIds, dataBundle?.supportOrganisations ?? [])} selected
              organisation(s) are no longer published and will block Ready for review / Publish until removed or republished.
            </p>
          ) : null}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-foreground">Advocates &amp; counsellors</legend>
          {selectableProfessionals.length === 0 ? (
            <p className="text-xs text-muted-foreground">No published advocates/counsellors are available yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectableProfessionals.map((professional) => {
                const checked = supportProfessionalIds.includes(professional.id);
                return (
                  <label key={professional.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        markDirty(setSupportProfessionalIds)(toggleInArray(supportProfessionalIds, professional.id, event.target.checked))
                      }
                    />
                    {professional.fullName}
                    {professional.status !== "published" ? <span className="text-[10px] text-warning">(not published)</span> : null}
                  </label>
                );
              })}
            </div>
          )}
          {unpublishedSelectedCount(supportProfessionalIds, dataBundle?.supportProfessionals ?? []) > 0 ? (
            <p className="text-xs text-warning">
              {unpublishedSelectedCount(supportProfessionalIds, dataBundle?.supportProfessionals ?? [])} selected
              professional(s) are no longer published and will block Ready for review / Publish until removed or republished.
            </p>
          ) : null}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-foreground">Reporting destinations</legend>
          {selectableDestinations.length === 0 ? (
            <p className="text-xs text-muted-foreground">No published reporting destinations are available yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectableDestinations.map((destination) => {
                const checked = reportingDestinationIds.includes(destination.id);
                return (
                  <label key={destination.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        markDirty(setReportingDestinationIds)(toggleInArray(reportingDestinationIds, destination.id, event.target.checked))
                      }
                    />
                    {destination.name}
                    {destination.status !== "published" ? <span className="text-[10px] text-warning">(not published)</span> : null}
                  </label>
                );
              })}
            </div>
          )}
          {unpublishedSelectedCount(reportingDestinationIds, dataBundle?.reportingDestinations ?? []) > 0 ? (
            <p className="text-xs text-warning">
              {unpublishedSelectedCount(reportingDestinationIds, dataBundle?.reportingDestinations ?? [])} selected
              destination(s) are no longer published and will block Ready for review / Publish until removed or republished.
            </p>
          ) : null}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-foreground">Legislation sources</legend>
          {selectableDocuments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No published Knowledge &amp; Legislation documents are available yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectableDocuments.map((doc) => {
                const checked = legislationIds.includes(doc.id);
                return (
                  <label key={doc.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => markDirty(setLegislationIds)(toggleInArray(legislationIds, doc.id, event.target.checked))}
                    />
                    {doc.title}
                    {doc.status !== "published" ? <span className="text-[10px] text-warning">(not published)</span> : null}
                  </label>
                );
              })}
            </div>
          )}
          {unpublishedSelectedCount(legislationIds, dataBundle?.documents ?? []) > 0 ? (
            <p className="text-xs text-warning">
              {unpublishedSelectedCount(legislationIds, dataBundle?.documents ?? [])} selected legislation source(s) are no
              longer published and will block Ready for review / Publish until removed or republished.
            </p>
          ) : null}
        </fieldset>
      </section>

      {/* Section D: Governance */}
      <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-foreground">Governance</h2>
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
            <Button variant="destructive" onClick={() => router.push("/taxonomy/matching-rules")}>
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
