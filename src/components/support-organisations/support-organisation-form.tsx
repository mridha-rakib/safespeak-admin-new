"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SupportOrganisationPreview } from "@/components/support-organisations/support-organisation-preview";
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
import { ORGANISATION_TYPES, ORGANISATION_TYPE_LABEL } from "@/lib/models/organisation-type";
import type { SupportOrganisation } from "@/lib/models/support-organisation";
import { SUPPORT_MODE_LABEL } from "@/lib/support-directory/labels";
import { cleanOptionalText } from "@/lib/support-directory/contact";
import { getSupportOrganisationBlockers } from "@/lib/support-directory/support-organisation-eligibility";
import { VERIFICATION_STATUSES, VERIFICATION_STATUS_DESCRIPTION, VERIFICATION_STATUS_LABEL } from "@/lib/models/verification";
import { VersionConflictError } from "@/lib/repositories/errors";

const selectClass = "h-10 w-full rounded-full border border-input bg-card px-4 text-sm text-foreground focus-visible:outline-none";

export function SupportOrganisationForm({ initialRecord }: { initialRecord?: SupportOrganisation | null }) {
  const { repository } = useAdminRepository();
  const router = useRouter();
  const dataBundle = useTaxonomyDataBundle();
  const incidentTypes = useCrudList((repo) => repo.incidentTypes) ?? [];

  const [record, setRecord] = useState<SupportOrganisation | null>(initialRecord ?? null);
  const [name, setName] = useState(initialRecord?.name ?? "");
  const [organisationType, setOrganisationType] = useState<SupportOrganisation["organisationType"]>(initialRecord?.organisationType);
  const [shortDescription, setShortDescription] = useState(initialRecord?.shortDescription ?? "");
  const [fullDescription, setFullDescription] = useState(initialRecord?.fullDescription ?? "");

  const [resourceCategoryIds, setResourceCategoryIds] = useState<string[]>(initialRecord?.resourceCategoryIds ?? []);
  const [incidentTypeIds, setIncidentTypeIds] = useState<string[]>(initialRecord?.incidentTypeIds ?? []);
  const [jurisdictions, setJurisdictions] = useState<SupportOrganisation["jurisdictions"]>(initialRecord?.jurisdictions ?? []);
  const [australiaWide, setAustraliaWide] = useState(initialRecord?.australiaWide ?? false);
  const [audienceGroups, setAudienceGroups] = useState<string[]>(initialRecord?.audienceGroups ?? []);
  const [languages, setLanguages] = useState<string[]>(initialRecord?.languages ?? ["en"]);
  const [serviceDeliveryModes, setServiceDeliveryModes] = useState<SupportOrganisation["serviceDeliveryModes"]>(
    initialRecord?.serviceDeliveryModes ?? []
  );
  const [tags, setTags] = useState<string[]>(initialRecord?.tags ?? []);

  const [eligibilityInformation, setEligibilityInformation] = useState(initialRecord?.eligibilityInformation ?? "");
  const [costInformation, setCostInformation] = useState(initialRecord?.costInformation ?? "");
  const [openingHours, setOpeningHours] = useState(initialRecord?.openingHours ?? "");
  const [accessibilityInformation, setAccessibilityInformation] = useState(initialRecord?.accessibilityInformation ?? "");
  const [emergencyService, setEmergencyService] = useState(initialRecord?.emergencyService ?? false);

  const [phone, setPhone] = useState(initialRecord?.phone ?? "");
  const [email, setEmail] = useState(initialRecord?.email ?? "");
  const [website, setWebsite] = useState(initialRecord?.website ?? "");
  const [bookingUrl, setBookingUrl] = useState(initialRecord?.bookingUrl ?? "");
  const [referralUrl, setReferralUrl] = useState(initialRecord?.referralUrl ?? "");
  const [address, setAddress] = useState(initialRecord?.address ?? "");
  const [postalAddress, setPostalAddress] = useState(initialRecord?.postalAddress ?? "");

  const [verificationStatus, setVerificationStatus] = useState<SupportOrganisation["verificationStatus"]>(
    initialRecord?.verificationStatus ?? "not_verified"
  );
  const [verificationNotes, setVerificationNotes] = useState(initialRecord?.verificationNotes ?? "");
  const [verifiedDate, setVerifiedDate] = useState(initialRecord?.verifiedDate ?? "");
  const [verificationExpiryDate, setVerificationExpiryDate] = useState(initialRecord?.verificationExpiryDate ?? "");
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
    else router.push("/content/support-organisations");
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
        // Legacy Phase 1 tag list, preserved but not exposed in this form —
        // resourceCategoryIds now serves the equivalent classification purpose.
        servicesOffered: record?.servicesOffered ?? [],
        organisationType,
        shortDescription: cleanOptionalText(shortDescription),
        fullDescription: cleanOptionalText(fullDescription),
        resourceCategoryIds,
        incidentTypeIds,
        jurisdictions,
        australiaWide,
        audienceGroups,
        languages,
        serviceDeliveryModes,
        tags,
        eligibilityInformation: cleanOptionalText(eligibilityInformation),
        costInformation: cleanOptionalText(costInformation),
        openingHours: cleanOptionalText(openingHours),
        accessibilityInformation: cleanOptionalText(accessibilityInformation),
        emergencyService,
        phone: cleanOptionalText(phone),
        email: cleanOptionalText(email),
        website: cleanOptionalText(website),
        bookingUrl: cleanOptionalText(bookingUrl),
        referralUrl: cleanOptionalText(referralUrl),
        address: cleanOptionalText(address),
        postalAddress: cleanOptionalText(postalAddress),
        verificationStatus,
        verificationNotes: cleanOptionalText(verificationNotes),
        verifiedDate: verifiedDate || undefined,
        verificationExpiryDate: verificationExpiryDate || undefined,
        reviewDueDate: reviewDueDate || undefined,
        internalNotes: cleanOptionalText(internalNotes),
      };

      let saved: SupportOrganisation;
      if (!record) {
        const draft: SupportOrganisation = { ...createBaseFields({ status: target }), ...fields };
        saved = await repository.supportOrganisations.create(draft);
      } else {
        saved = await repository.supportOrganisations.updateWithVersionCheck(record.id, fields, record.version, LOCAL_ADMIN_ACTOR);
      }

      if (saved.status !== target) {
        saved = await repository.supportOrganisations.transitionStatus(saved.id, target, LOCAL_ADMIN_ACTOR);
      }

      setRecord(saved);
      setIsDirty(false);
      router.push(`/content/support-organisations/${saved.id}` as Route);
    } catch (err) {
      if (err instanceof VersionConflictError) setError(err.message);
      else setError("Something went wrong while saving. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const previewRecord: SupportOrganisation = {
    ...(record ?? createBaseFields({ status: "draft" })),
    name: name.trim(),
    organisationType,
    shortDescription: cleanOptionalText(shortDescription),
    fullDescription: cleanOptionalText(fullDescription),
    resourceCategoryIds,
    incidentTypeIds,
    jurisdictions,
    australiaWide,
    audienceGroups,
    languages,
    serviceDeliveryModes,
    tags,
    eligibilityInformation: cleanOptionalText(eligibilityInformation),
    costInformation: cleanOptionalText(costInformation),
    openingHours: cleanOptionalText(openingHours),
    accessibilityInformation: cleanOptionalText(accessibilityInformation),
    emergencyService,
    phone: cleanOptionalText(phone),
    email: cleanOptionalText(email),
    website: cleanOptionalText(website),
    bookingUrl: cleanOptionalText(bookingUrl),
    referralUrl: cleanOptionalText(referralUrl),
    address: cleanOptionalText(address),
    postalAddress: cleanOptionalText(postalAddress),
    verificationStatus,
    reviewDueDate: reviewDueDate || undefined,
  } as SupportOrganisation;

  const blockers = dataBundle ? getSupportOrganisationBlockers(previewRecord, dataBundle) : ["Loading related records…"];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        {error ? (
          <Alert tone="destructive" title="This record could not be saved" role="alert">
            {error}
          </Alert>
        ) : null}

        {/* Section A: Organisation information */}
        <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Organisation information</h2>
          <div className="space-y-1.5">
            <Label htmlFor="name">Organisation name</Label>
            <Input id="name" value={name} onChange={(event) => markDirty(setName)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="organisationType">Organisation type</Label>
            <select
              id="organisationType"
              className={selectClass}
              value={organisationType ?? ""}
              onChange={(event) => markDirty(setOrganisationType)((event.target.value || undefined) as SupportOrganisation["organisationType"])}
            >
              <option value="">Not set</option>
              {ORGANISATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ORGANISATION_TYPE_LABEL[type]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shortDescription">Short description</Label>
            <Textarea id="shortDescription" rows={2} value={shortDescription} onChange={(event) => markDirty(setShortDescription)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fullDescription">Full service description</Label>
            <Textarea id="fullDescription" rows={6} value={fullDescription} onChange={(event) => markDirty(setFullDescription)(event.target.value)} />
          </div>
        </section>

        {/* Section B: Classification */}
        <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Classification</h2>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">Resource categories</legend>
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

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">Jurisdictions</legend>
            <label className="inline-flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={australiaWide}
                onChange={(event) => markDirty(setAustraliaWide)(event.target.checked)}
              />
              Australia-wide service
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
                          markDirty(setJurisdictions)(
                            event.target.checked ? [...jurisdictions, j.value] : jurisdictions.filter((v) => v !== j.value)
                          )
                        }
                      />
                      {j.label}
                    </label>
                  );
                })}
              </div>
            ) : null}
          </fieldset>

          <TagListInput label="Audience groups" placeholder="e.g. young people" values={audienceGroups} onChange={markDirty(setAudienceGroups)} />
          <TagListInput label="Languages" placeholder="e.g. en" values={languages} onChange={markDirty(setLanguages)} />

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">Service delivery modes</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SUPPORT_MODE_LABEL) as (keyof typeof SUPPORT_MODE_LABEL)[]).map((mode) => {
                const checked = serviceDeliveryModes.includes(mode);
                return (
                  <label key={mode} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        markDirty(setServiceDeliveryModes)(
                          event.target.checked ? [...serviceDeliveryModes, mode] : serviceDeliveryModes.filter((m) => m !== mode)
                        )
                      }
                    />
                    {SUPPORT_MODE_LABEL[mode]}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <TagListInput label="Tags" placeholder="e.g. free" values={tags} onChange={markDirty(setTags)} />
        </section>

        {/* Section C: Access and eligibility */}
        <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Access and eligibility</h2>
          <div className="space-y-1.5">
            <Label htmlFor="eligibilityInformation">Eligibility information</Label>
            <Textarea id="eligibilityInformation" rows={3} value={eligibilityInformation} onChange={(event) => markDirty(setEligibilityInformation)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="costInformation">Cost information</Label>
            <Textarea id="costInformation" rows={2} value={costInformation} onChange={(event) => markDirty(setCostInformation)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="openingHours">Opening hours</Label>
            <Input id="openingHours" value={openingHours} onChange={(event) => markDirty(setOpeningHours)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accessibilityInformation">Accessibility information</Label>
            <Textarea id="accessibilityInformation" rows={2} value={accessibilityInformation} onChange={(event) => markDirty(setAccessibilityInformation)(event.target.value)} />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={emergencyService} onChange={(event) => markDirty(setEmergencyService)(event.target.checked)} />
            This organisation is an emergency service
          </label>
        </section>

        {/* Section D: Contact details */}
        <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Contact details</h2>
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
              <Label htmlFor="bookingUrl">Booking URL</Label>
              <Input id="bookingUrl" value={bookingUrl} onChange={(event) => markDirty(setBookingUrl)(event.target.value)} placeholder="https://" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="referralUrl">Referral URL</Label>
              <Input id="referralUrl" value={referralUrl} onChange={(event) => markDirty(setReferralUrl)(event.target.value)} placeholder="https://" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Physical address</Label>
            <Textarea id="address" rows={2} value={address} onChange={(event) => markDirty(setAddress)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postalAddress">Postal address</Label>
            <Textarea id="postalAddress" rows={2} value={postalAddress} onChange={(event) => markDirty(setPostalAddress)(event.target.value)} />
          </div>
        </section>

        {/* Section E: Verification and governance */}
        <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Verification and governance</h2>
          <div className="space-y-1.5">
            <Label htmlFor="verificationStatus">Verification status</Label>
            <select
              id="verificationStatus"
              className={selectClass}
              value={verificationStatus}
              onChange={(event) => markDirty(setVerificationStatus)(event.target.value as SupportOrganisation["verificationStatus"])}
            >
              {VERIFICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {VERIFICATION_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{VERIFICATION_STATUS_DESCRIPTION[verificationStatus]}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="verifiedDate">Verified date</Label>
              <Input id="verifiedDate" type="date" value={verifiedDate} onChange={(event) => markDirty(setVerifiedDate)(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="verificationExpiryDate">Verification review / expiry date</Label>
              <Input
                id="verificationExpiryDate"
                type="date"
                value={verificationExpiryDate}
                onChange={(event) => markDirty(setVerificationExpiryDate)(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="verificationNotes">Verification notes (admin-only)</Label>
            <Textarea id="verificationNotes" rows={3} value={verificationNotes} onChange={(event) => markDirty(setVerificationNotes)(event.target.value)} />
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
        <SupportOrganisationPreview record={previewRecord} />
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
            <Button variant="destructive" onClick={() => router.push("/content/support-organisations")}>
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
