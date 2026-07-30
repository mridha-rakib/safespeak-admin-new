"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DestinationPreview } from "@/components/reporting-destinations/destination-preview";
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
import type { ReportingDestination } from "@/lib/models/reporting-destination";
import { DESTINATION_TYPES, DESTINATION_TYPE_LABEL, REPORTING_METHODS, REPORTING_METHOD_LABEL, TRISTATE_VALUES, TRISTATE_LABEL } from "@/lib/models/reporting-destination-type";
import { cleanOptionalText } from "@/lib/support-directory/contact";
import { isSelectableForNewRelationship } from "@/lib/content/relationship-ids";
import { getDestinationBlockers } from "@/lib/support-directory/destination-eligibility";
import { getUnsupportedReportingMethods } from "@/lib/support-directory/reporting-method";
import { VersionConflictError } from "@/lib/repositories/errors";

const selectClass = "h-10 w-full rounded-full border border-input bg-card px-4 text-sm text-foreground focus-visible:outline-none";

export function DestinationForm({ initialRecord }: { initialRecord?: ReportingDestination | null }) {
  const { repository } = useAdminRepository();
  const router = useRouter();
  const dataBundle = useTaxonomyDataBundle();
  const incidentTypes = useCrudList((repo) => repo.incidentTypes) ?? [];

  const [record, setRecord] = useState<ReportingDestination | null>(initialRecord ?? null);
  const [name, setName] = useState(initialRecord?.name ?? "");
  const [destinationType, setDestinationType] = useState<ReportingDestination["destinationType"]>(initialRecord?.destinationType);
  const [description, setDescription] = useState(initialRecord?.description ?? "");
  const [fullDescription, setFullDescription] = useState(initialRecord?.fullDescription ?? "");
  const [organisationId, setOrganisationId] = useState(initialRecord?.organisationId ?? "");

  const [resourceCategoryIds, setResourceCategoryIds] = useState<string[]>(initialRecord?.resourceCategoryIds ?? []);
  const [incidentTypeIds, setIncidentTypeIds] = useState<string[]>(initialRecord?.incidentTypeIds ?? []);
  const [jurisdictions, setJurisdictions] = useState<ReportingDestination["jurisdictions"]>(initialRecord?.jurisdictions ?? []);
  const [australiaWide, setAustraliaWide] = useState(initialRecord?.australiaWide ?? false);
  const [audienceGroups, setAudienceGroups] = useState<string[]>(initialRecord?.audienceGroups ?? []);
  const [languages, setLanguages] = useState<string[]>(initialRecord?.languages ?? ["en"]);
  const [tags, setTags] = useState<string[]>(initialRecord?.tags ?? []);

  const [reportingMethods, setReportingMethods] = useState<ReportingDestination["reportingMethods"]>(initialRecord?.reportingMethods ?? []);
  const [phone, setPhone] = useState(initialRecord?.phone ?? "");
  const [email, setEmail] = useState(initialRecord?.email ?? "");
  const [website, setWebsite] = useState(initialRecord?.website ?? "");
  const [onlineReportingUrl, setOnlineReportingUrl] = useState(initialRecord?.onlineReportingUrl ?? "");
  const [bookingUrl, setBookingUrl] = useState(initialRecord?.bookingUrl ?? "");
  const [address, setAddress] = useState(initialRecord?.address ?? "");
  const [openingHours, setOpeningHours] = useState(initialRecord?.openingHours ?? "");

  const [reportingInstructions, setReportingInstructions] = useState(initialRecord?.reportingInstructions ?? "");
  const [evidenceGuidance, setEvidenceGuidance] = useState(initialRecord?.evidenceGuidance ?? "");
  const [eligibilityInformation, setEligibilityInformation] = useState(initialRecord?.eligibilityInformation ?? "");
  const [costInformation, setCostInformation] = useState(initialRecord?.costInformation ?? "");
  const [anonymousReporting, setAnonymousReporting] = useState<ReportingDestination["anonymousReporting"]>(
    initialRecord?.anonymousReporting ?? "unknown"
  );
  const [confidentialityInformation, setConfidentialityInformation] = useState(initialRecord?.confidentialityInformation ?? "");
  const [emergencySuitability, setEmergencySuitability] = useState<ReportingDestination["emergencySuitability"]>(
    initialRecord?.emergencySuitability ?? "unknown"
  );
  const [responseExpectations, setResponseExpectations] = useState(initialRecord?.responseExpectations ?? "");
  const [publicDisclaimer, setPublicDisclaimer] = useState(initialRecord?.publicDisclaimer ?? "");

  const [sourceNotes, setSourceNotes] = useState(initialRecord?.sourceNotes ?? "");
  const [reviewDueDate, setReviewDueDate] = useState(initialRecord?.reviewDueDate ?? "");
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
    else router.push("/content/reporting-destinations");
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
        name: name.trim(),
        destinationType,
        description: cleanOptionalText(description),
        fullDescription: cleanOptionalText(fullDescription),
        organisationId: organisationId || undefined,
        resourceCategoryIds,
        incidentTypeIds,
        jurisdictions,
        australiaWide,
        audienceGroups,
        languages,
        tags,
        reportingMethods,
        phone: cleanOptionalText(phone),
        email: cleanOptionalText(email),
        website: cleanOptionalText(website),
        onlineReportingUrl: cleanOptionalText(onlineReportingUrl),
        bookingUrl: cleanOptionalText(bookingUrl),
        address: cleanOptionalText(address),
        openingHours: cleanOptionalText(openingHours),
        reportingInstructions: cleanOptionalText(reportingInstructions),
        evidenceGuidance: cleanOptionalText(evidenceGuidance),
        eligibilityInformation: cleanOptionalText(eligibilityInformation),
        costInformation: cleanOptionalText(costInformation),
        anonymousReporting,
        confidentialityInformation: cleanOptionalText(confidentialityInformation),
        emergencySuitability,
        responseExpectations: cleanOptionalText(responseExpectations),
        publicDisclaimer: cleanOptionalText(publicDisclaimer),
        sourceNotes: cleanOptionalText(sourceNotes),
        reviewDueDate: reviewDueDate || undefined,
        internalNotes: cleanOptionalText(internalNotes),
      };

      let saved: ReportingDestination;
      if (!record) {
        const draft: ReportingDestination = { ...createBaseFields({ status: target }), ...fields };
        saved = await repository.reportingDestinations.create(draft);
      } else {
        saved = await repository.reportingDestinations.updateWithVersionCheck(record.id, fields, record.version, LOCAL_ADMIN_ACTOR);
      }

      if (saved.status !== target) {
        saved = await repository.reportingDestinations.transitionStatus(saved.id, target, LOCAL_ADMIN_ACTOR);
      }

      setRecord(saved);
      setIsDirty(false);
      router.push(`/content/reporting-destinations/${saved.id}` as Route);
    } catch (err) {
      if (err instanceof VersionConflictError) setError(err.message);
      else setError("Something went wrong while saving. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const previewRecord: ReportingDestination = {
    ...(record ?? createBaseFields({ status: "draft" })),
    name: name.trim(),
    destinationType,
    description: cleanOptionalText(description),
    fullDescription: cleanOptionalText(fullDescription),
    organisationId: organisationId || undefined,
    resourceCategoryIds,
    incidentTypeIds,
    jurisdictions,
    australiaWide,
    audienceGroups,
    languages,
    tags,
    reportingMethods,
    phone: cleanOptionalText(phone),
    email: cleanOptionalText(email),
    website: cleanOptionalText(website),
    onlineReportingUrl: cleanOptionalText(onlineReportingUrl),
    bookingUrl: cleanOptionalText(bookingUrl),
    address: cleanOptionalText(address),
    openingHours: cleanOptionalText(openingHours),
    reportingInstructions: cleanOptionalText(reportingInstructions),
    evidenceGuidance: cleanOptionalText(evidenceGuidance),
    eligibilityInformation: cleanOptionalText(eligibilityInformation),
    costInformation: cleanOptionalText(costInformation),
    anonymousReporting,
    confidentialityInformation: cleanOptionalText(confidentialityInformation),
    emergencySuitability,
    responseExpectations: cleanOptionalText(responseExpectations),
    publicDisclaimer: cleanOptionalText(publicDisclaimer),
    reviewDueDate: reviewDueDate || undefined,
  } as ReportingDestination;

  const eligibilityContext = dataBundle
    ? { resourceCategories: dataBundle.resourceCategories, supportOrganisations: dataBundle.supportOrganisations }
    : undefined;
  const blockers = eligibilityContext ? getDestinationBlockers(previewRecord, eligibilityContext) : ["Loading related records…"];
  const unsupportedMethods = getUnsupportedReportingMethods(previewRecord);

  const selectableOrganisations = (dataBundle?.supportOrganisations ?? []).filter(
    (o) => isSelectableForNewRelationship(o.status) || o.id === organisationId
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        {error ? (
          <Alert tone="destructive" title="This record could not be saved" role="alert">
            {error}
          </Alert>
        ) : null}

        {/* Section A: Destination information */}
        <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Destination information</h2>
          <div className="space-y-1.5">
            <Label htmlFor="name">Destination name</Label>
            <Input id="name" value={name} onChange={(event) => markDirty(setName)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="destinationType">Destination type</Label>
            <select
              id="destinationType"
              className={selectClass}
              value={destinationType ?? ""}
              onChange={(event) => markDirty(setDestinationType)((event.target.value || undefined) as ReportingDestination["destinationType"])}
            >
              <option value="">Not set</option>
              {DESTINATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {DESTINATION_TYPE_LABEL[type]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Short description</Label>
            <Textarea id="description" rows={2} value={description} onChange={(event) => markDirty(setDescription)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fullDescription">Full description</Label>
            <Textarea id="fullDescription" rows={4} value={fullDescription} onChange={(event) => markDirty(setFullDescription)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="organisationId">Related organisation (optional)</Label>
            <select id="organisationId" className={selectClass} value={organisationId} onChange={(event) => markDirty(setOrganisationId)(event.target.value)}>
              <option value="">None</option>
              {selectableOrganisations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Section B: Scope and classification */}
        <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Scope and classification</h2>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">Jurisdictions</legend>
            <label className="inline-flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={australiaWide} onChange={(event) => markDirty(setAustraliaWide)(event.target.checked)} />
              Australia-wide
            </label>
            {!australiaWide ? (
              <div className="flex flex-wrap gap-2">
                {AUSTRALIAN_JURISDICTIONS.map((j) => {
                  const checked = jurisdictions.includes(j.value);
                  return (
                    <label key={j.value} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          markDirty(setJurisdictions)(event.target.checked ? [...jurisdictions, j.value] : jurisdictions.filter((v) => v !== j.value))
                        }
                      />
                      {j.label}
                    </label>
                  );
                })}
              </div>
            ) : null}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">Resource categories (optional)</legend>
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
                          event.target.checked ? [...resourceCategoryIds, category.id] : resourceCategoryIds.filter((id) => id !== category.id)
                        )
                      }
                    />
                    {category.name}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">Incident categories (optional)</legend>
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
                          event.target.checked ? [...incidentTypeIds, incidentType.id] : incidentTypeIds.filter((id) => id !== incidentType.id)
                        )
                      }
                    />
                    {incidentType.name}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <TagListInput label="Languages" placeholder="e.g. en" values={languages} onChange={markDirty(setLanguages)} />
          <TagListInput label="Audience groups (optional)" placeholder="e.g. young people" values={audienceGroups} onChange={markDirty(setAudienceGroups)} />
          <TagListInput label="Tags" placeholder="e.g. 24-hour" values={tags} onChange={markDirty(setTags)} />
        </section>

        {/* Section C: Reporting methods */}
        <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Reporting methods</h2>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">Supported reporting methods</legend>
            <div className="flex flex-wrap gap-2">
              {REPORTING_METHODS.map((method) => {
                const checked = reportingMethods.includes(method);
                return (
                  <label key={method} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        markDirty(setReportingMethods)(
                          event.target.checked ? [...reportingMethods, method] : reportingMethods.filter((m) => m !== method)
                        )
                      }
                    />
                    {REPORTING_METHOD_LABEL[method]}
                  </label>
                );
              })}
            </div>
            {unsupportedMethods.length > 0 ? (
              <p className="text-xs text-warning">
                Missing contact information for: {unsupportedMethods.map((m) => REPORTING_METHOD_LABEL[m]).join(", ")}.
              </p>
            ) : null}
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(event) => markDirty(setPhone)(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(event) => markDirty(setEmail)(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={website} onChange={(event) => markDirty(setWebsite)(event.target.value)} placeholder="https://" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="onlineReportingUrl">Online reporting URL</Label>
              <Input id="onlineReportingUrl" value={onlineReportingUrl} onChange={(event) => markDirty(setOnlineReportingUrl)(event.target.value)} placeholder="https://" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bookingUrl">Booking / appointment URL</Label>
              <Input id="bookingUrl" value={bookingUrl} onChange={(event) => markDirty(setBookingUrl)(event.target.value)} placeholder="https://" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="openingHours">Opening hours</Label>
              <Input id="openingHours" value={openingHours} onChange={(event) => markDirty(setOpeningHours)(event.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Physical address</Label>
            <Textarea id="address" rows={2} value={address} onChange={(event) => markDirty(setAddress)(event.target.value)} />
          </div>
        </section>

        {/* Section D: User guidance */}
        <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">User guidance</h2>
          <div className="space-y-1.5">
            <Label htmlFor="reportingInstructions">Instructions</Label>
            <Textarea id="reportingInstructions" rows={3} value={reportingInstructions} onChange={(event) => markDirty(setReportingInstructions)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="evidenceGuidance">Evidence guidance (optional)</Label>
            <Textarea id="evidenceGuidance" rows={2} value={evidenceGuidance} onChange={(event) => markDirty(setEvidenceGuidance)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eligibilityInformation">Eligibility information (optional)</Label>
            <Textarea id="eligibilityInformation" rows={2} value={eligibilityInformation} onChange={(event) => markDirty(setEligibilityInformation)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="costInformation">Cost information (optional)</Label>
            <Textarea id="costInformation" rows={2} value={costInformation} onChange={(event) => markDirty(setCostInformation)(event.target.value)} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="anonymousReporting">Anonymous reporting support</Label>
              <select
                id="anonymousReporting"
                className={selectClass}
                value={anonymousReporting}
                onChange={(event) => markDirty(setAnonymousReporting)(event.target.value as ReportingDestination["anonymousReporting"])}
              >
                {TRISTATE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {TRISTATE_LABEL[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergencySuitability">Emergency suitability</Label>
              <select
                id="emergencySuitability"
                className={selectClass}
                value={emergencySuitability}
                onChange={(event) => markDirty(setEmergencySuitability)(event.target.value as ReportingDestination["emergencySuitability"])}
              >
                {TRISTATE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {TRISTATE_LABEL[value]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Never inferred from destination type — set this explicitly.</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confidentialityInformation">Confidentiality information (optional)</Label>
            <Textarea
              id="confidentialityInformation"
              rows={2}
              value={confidentialityInformation}
              onChange={(event) => markDirty(setConfidentialityInformation)(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="responseExpectations">Response expectations (optional)</Label>
            <Textarea id="responseExpectations" rows={2} value={responseExpectations} onChange={(event) => markDirty(setResponseExpectations)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="publicDisclaimer">Public disclaimer (optional)</Label>
            <Textarea
              id="publicDisclaimer"
              rows={2}
              value={publicDisclaimer}
              onChange={(event) => markDirty(setPublicDisclaimer)(event.target.value)}
              placeholder="This information is general and may vary by jurisdiction."
            />
          </div>
        </section>

        {/* Section E: Governance */}
        <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Governance</h2>
          <div className="space-y-1.5">
            <Label htmlFor="sourceNotes">Source notes (admin-only)</Label>
            <Textarea id="sourceNotes" rows={2} value={sourceNotes} onChange={(event) => markDirty(setSourceNotes)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reviewDueDate">Review due date</Label>
            <Input id="reviewDueDate" type="date" value={reviewDueDate} onChange={(event) => markDirty(setReviewDueDate)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="internalNotes">Internal notes (admin-only, never exported)</Label>
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
        <DestinationPreview record={previewRecord} />
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
            <Button variant="destructive" onClick={() => router.push("/content/reporting-destinations")}>
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
