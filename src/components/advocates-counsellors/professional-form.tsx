"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProfileImageField } from "@/components/advocates-counsellors/profile-image-field";
import { PROFESSIONAL_TYPE_LABEL } from "@/components/advocates-counsellors/columns";
import { ProfessionalPreview } from "@/components/advocates-counsellors/professional-preview";
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
import { COST_TYPES, PROFESSIONAL_TYPES, SUPPORT_MODES, type SupportProfessional } from "@/lib/models/support-professional";
import { COST_TYPE_LABEL, SUPPORT_MODE_LABEL } from "@/lib/support-directory/labels";
import { cleanOptionalText } from "@/lib/support-directory/contact";
import { isSelectableForNewRelationship } from "@/lib/content/relationship-ids";
import { getProfessionalBlockers } from "@/lib/support-directory/professional-eligibility";
import { VERIFICATION_STATUSES, VERIFICATION_STATUS_DESCRIPTION, VERIFICATION_STATUS_LABEL } from "@/lib/models/verification";
import { VersionConflictError } from "@/lib/repositories/errors";

const selectClass = "h-10 w-full rounded-full border border-input bg-card px-4 text-sm text-foreground focus-visible:outline-none";

export function ProfessionalForm({ initialRecord }: { initialRecord?: SupportProfessional | null }) {
  const { repository } = useAdminRepository();
  const router = useRouter();
  const dataBundle = useTaxonomyDataBundle();
  const incidentTypes = useCrudList((repo) => repo.incidentTypes) ?? [];
  const triageLabels = useCrudList((repo) => repo.triageLabels) ?? [];

  const [record, setRecord] = useState<SupportProfessional | null>(initialRecord ?? null);
  const [fullName, setFullName] = useState(initialRecord?.fullName ?? "");
  const [displayName, setDisplayName] = useState(initialRecord?.displayName ?? "");
  const [professionalType, setProfessionalType] = useState<SupportProfessional["professionalType"]>(
    initialRecord?.professionalType ?? "advocate"
  );
  const [jobTitle, setJobTitle] = useState(initialRecord?.jobTitle ?? "");
  const [organisationId, setOrganisationId] = useState(initialRecord?.organisationId ?? "");
  const [shortIntroduction, setShortIntroduction] = useState(initialRecord?.shortIntroduction ?? "");
  const [fullBiography, setFullBiography] = useState(initialRecord?.fullBiography ?? "");

  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [imageMarkedForRemoval, setImageMarkedForRemoval] = useState(false);
  const [pendingImagePreviewUrl, setPendingImagePreviewUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!pendingImageFile) {
      setPendingImagePreviewUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(pendingImageFile);
    setPendingImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingImageFile]);

  const [resourceCategoryIds, setResourceCategoryIds] = useState<string[]>(initialRecord?.resourceCategoryIds ?? []);
  const [incidentTypeIds, setIncidentTypeIds] = useState<string[]>(initialRecord?.incidentTypeIds ?? []);
  const [triageLabelIds, setTriageLabelIds] = useState<string[]>(initialRecord?.triageLabelIds ?? []);
  const [specialisations, setSpecialisations] = useState<string[]>(initialRecord?.specialisations ?? []);
  const [jurisdictions, setJurisdictions] = useState<SupportProfessional["jurisdictions"]>(initialRecord?.jurisdictions ?? []);
  const [australiaWide, setAustraliaWide] = useState(initialRecord?.australiaWide ?? false);
  const [languages, setLanguages] = useState<string[]>(initialRecord?.languages ?? ["en"]);
  const [audienceGroups, setAudienceGroups] = useState<string[]>(initialRecord?.communitiesSupported ?? []);
  const [supportModes, setSupportModes] = useState<SupportProfessional["supportModes"]>(initialRecord?.supportModes ?? []);

  const [registrationOrMembershipDetails, setRegistrationOrMembershipDetails] = useState(
    initialRecord?.registrationOrMembershipDetails ?? ""
  );
  const [costType, setCostType] = useState<SupportProfessional["costType"]>(initialRecord?.costType ?? "unknown");
  const [feeInformation, setFeeInformation] = useState(initialRecord?.feeInformation ?? "");
  const [availability, setAvailability] = useState(initialRecord?.availability ?? "");

  const [phone, setPhone] = useState(initialRecord?.phone ?? "");
  const [email, setEmail] = useState(initialRecord?.email ?? "");
  const [bookingUrl, setBookingUrl] = useState(initialRecord?.bookingUrl ?? "");
  const [organisationWebsite, setOrganisationWebsite] = useState(initialRecord?.organisationWebsite ?? "");

  const [verificationStatus, setVerificationStatus] = useState<SupportProfessional["verificationStatus"]>(
    initialRecord?.verificationStatus ?? "not_verified"
  );
  const [verificationNotes, setVerificationNotes] = useState(initialRecord?.verificationNotes ?? "");
  const [verifiedDate, setVerifiedDate] = useState(initialRecord?.verifiedDate ?? "");
  const [verificationExpiryDate, setVerificationExpiryDate] = useState(initialRecord?.verificationExpiryDate ?? "");
  const [nextReviewDate, setNextReviewDate] = useState(initialRecord?.nextReviewDate ?? "");
  const [internalReviewNotes, setInternalReviewNotes] = useState(initialRecord?.internalReviewNotes ?? "");

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
    else router.push("/content/advocates-counsellors");
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
        fullName: fullName.trim(),
        displayName: cleanOptionalText(displayName),
        professionalType,
        jobTitle: cleanOptionalText(jobTitle),
        organisationId: organisationId || undefined,
        shortIntroduction: cleanOptionalText(shortIntroduction),
        fullBiography: cleanOptionalText(fullBiography),
        areasOfSupport: record?.areasOfSupport ?? [],
        resourceCategoryIds,
        incidentTypeIds,
        triageLabelIds,
        specialisations,
        communitiesSupported: audienceGroups,
        ageGroupsSupported: record?.ageGroupsSupported ?? [],
        jurisdictions,
        australiaWide,
        serviceLocations: record?.serviceLocations ?? [],
        supportModes,
        availability: cleanOptionalText(availability),
        timeZone: record?.timeZone,
        languages,
        accessibilitySupport: record?.accessibilitySupport ?? [],
        costType,
        feeInformation: cleanOptionalText(feeInformation),
        acceptingNewReferrals: record?.acceptingNewReferrals ?? false,
        phone: cleanOptionalText(phone),
        email: cleanOptionalText(email),
        bookingUrl: cleanOptionalText(bookingUrl),
        organisationWebsite: cleanOptionalText(organisationWebsite),
        officeAddress: record?.officeAddress,
        referralInstructions: record?.referralInstructions,
        contactNotes: record?.contactNotes,
        verificationStatus,
        verificationNotes: cleanOptionalText(verificationNotes),
        verifiedDate: verifiedDate || undefined,
        verificationExpiryDate: verificationExpiryDate || undefined,
        credentials: record?.credentials ?? [],
        registrationOrMembershipDetails: cleanOptionalText(registrationOrMembershipDetails),
        dataSource: record?.dataSource,
        lastReviewedDate: record?.lastReviewedDate,
        nextReviewDate: nextReviewDate || undefined,
        internalReviewNotes: cleanOptionalText(internalReviewNotes),
      };

      let saved: SupportProfessional;
      if (!record) {
        const draft: SupportProfessional = { ...createBaseFields({ status: target }), ...fields };
        saved = await repository.supportProfessionals.create(draft);
      } else {
        saved = await repository.supportProfessionals.updateWithVersionCheck(record.id, fields, record.version, LOCAL_ADMIN_ACTOR);
      }

      if (pendingImageFile) {
        await repository.supportProfessionals.setProfileImage(
          saved.id,
          pendingImageFile,
          { fileName: pendingImageFile.name, fileSizeBytes: pendingImageFile.size, fileType: pendingImageFile.type },
          LOCAL_ADMIN_ACTOR
        );
      } else if (imageMarkedForRemoval) {
        await repository.supportProfessionals.removeProfileImage(saved.id, LOCAL_ADMIN_ACTOR);
      }
      const savedWithImage = await repository.supportProfessionals.get(saved.id);
      if (savedWithImage) saved = savedWithImage;

      if (saved.status !== target) {
        saved = await repository.supportProfessionals.transitionStatus(saved.id, target, LOCAL_ADMIN_ACTOR);
      }

      setRecord(saved);
      setIsDirty(false);
      setPendingImageFile(null);
      setImageMarkedForRemoval(false);
      router.push(`/content/advocates-counsellors/${saved.id}` as Route);
    } catch (err) {
      if (err instanceof VersionConflictError) setError(err.message);
      else setError("Something went wrong while saving. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const previewRecord: SupportProfessional = {
    ...(record ?? createBaseFields({ status: "draft" })),
    fullName: fullName.trim(),
    displayName: cleanOptionalText(displayName),
    professionalType,
    jobTitle: cleanOptionalText(jobTitle),
    organisationId: organisationId || undefined,
    shortIntroduction: cleanOptionalText(shortIntroduction),
    fullBiography: cleanOptionalText(fullBiography),
    resourceCategoryIds,
    incidentTypeIds,
    triageLabelIds,
    specialisations,
    jurisdictions,
    australiaWide,
    languages,
    supportModes,
    availability: cleanOptionalText(availability),
    costType,
    phone: cleanOptionalText(phone),
    email: cleanOptionalText(email),
    bookingUrl: cleanOptionalText(bookingUrl),
    organisationWebsite: cleanOptionalText(organisationWebsite),
    verificationStatus,
    nextReviewDate: nextReviewDate || undefined,
    profilePhoto: imageMarkedForRemoval ? undefined : record?.profilePhoto,
  } as SupportProfessional;

  const eligibilityContext = dataBundle
    ? { resourceCategories: dataBundle.resourceCategories, supportOrganisations: dataBundle.supportOrganisations }
    : undefined;
  const blockers = eligibilityContext ? getProfessionalBlockers(previewRecord, eligibilityContext) : ["Loading related records…"];

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

        {/* Section A: Profile */}
        <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Profile</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(event) => markDirty(setFullName)(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Preferred display name (optional)</Label>
              <Input id="displayName" value={displayName} onChange={(event) => markDirty(setDisplayName)(event.target.value)} />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="professionalType">Professional type</Label>
              <select
                id="professionalType"
                className={selectClass}
                value={professionalType}
                onChange={(event) => markDirty(setProfessionalType)(event.target.value as SupportProfessional["professionalType"])}
              >
                {PROFESSIONAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {PROFESSIONAL_TYPE_LABEL[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle">Role title (optional)</Label>
              <Input id="jobTitle" value={jobTitle} onChange={(event) => markDirty(setJobTitle)(event.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="organisationId">Organisation (optional — leave blank for an independent professional)</Label>
            <select id="organisationId" className={selectClass} value={organisationId} onChange={(event) => markDirty(setOrganisationId)(event.target.value)}>
              <option value="">Independent (no organisation)</option>
              {selectableOrganisations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shortIntroduction">Short summary</Label>
            <Textarea id="shortIntroduction" rows={2} value={shortIntroduction} onChange={(event) => markDirty(setShortIntroduction)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fullBiography">Full biography / service description</Label>
            <Textarea id="fullBiography" rows={6} value={fullBiography} onChange={(event) => markDirty(setFullBiography)(event.target.value)} />
          </div>
          <ProfileImageField
            professionalId={record?.id}
            fullName={fullName}
            hasStoredImage={Boolean(record?.profilePhoto)}
            pendingFile={pendingImageFile}
            markedForRemoval={imageMarkedForRemoval}
            onFileSelected={(file) => {
              setPendingImageFile(file);
              setImageMarkedForRemoval(false);
              setIsDirty(true);
            }}
            onRemove={() => {
              setPendingImageFile(null);
              setImageMarkedForRemoval(true);
              setIsDirty(true);
            }}
            onUndoRemove={() => {
              setImageMarkedForRemoval(false);
              setIsDirty(true);
            }}
          />
        </section>

        {/* Section B: Service classification */}
        <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Service classification</h2>

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

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">Triage labels (optional)</legend>
            <div className="flex flex-wrap gap-2">
              {triageLabels.map((label) => {
                const checked = triageLabelIds.includes(label.id);
                return (
                  <label key={label.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        markDirty(setTriageLabelIds)(
                          event.target.checked ? [...triageLabelIds, label.id] : triageLabelIds.filter((id) => id !== label.id)
                        )
                      }
                    />
                    {label.name}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <TagListInput label="Specialisations" placeholder="e.g. trauma-informed counselling" values={specialisations} onChange={markDirty(setSpecialisations)} />

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

          <TagListInput label="Languages" placeholder="e.g. en" values={languages} onChange={markDirty(setLanguages)} />
          <TagListInput label="Audience groups (optional)" placeholder="e.g. young people" values={audienceGroups} onChange={markDirty(setAudienceGroups)} />

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">Service delivery modes</legend>
            <div className="flex flex-wrap gap-2">
              {SUPPORT_MODES.map((mode) => {
                const checked = supportModes.includes(mode);
                return (
                  <label key={mode} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        markDirty(setSupportModes)(event.target.checked ? [...supportModes, mode] : supportModes.filter((m) => m !== mode))
                      }
                    />
                    {SUPPORT_MODE_LABEL[mode]}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </section>

        {/* Section C: Experience and access */}
        <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Experience and access</h2>
          <div className="space-y-1.5">
            <Label htmlFor="registrationOrMembershipDetails">Qualifications / registration or membership details</Label>
            <Textarea
              id="registrationOrMembershipDetails"
              rows={2}
              value={registrationOrMembershipDetails}
              onChange={(event) => markDirty(setRegistrationOrMembershipDetails)(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Administrator-entered text only — this application does not independently verify qualifications or registration.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="costType">Cost</Label>
              <select id="costType" className={selectClass} value={costType} onChange={(event) => markDirty(setCostType)(event.target.value as SupportProfessional["costType"])}>
                {COST_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {COST_TYPE_LABEL[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="feeInformation">Fee information (optional)</Label>
              <Input id="feeInformation" value={feeInformation} onChange={(event) => markDirty(setFeeInformation)(event.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="availability">Availability notes (administrator-maintained, not a live signal)</Label>
            <Textarea id="availability" rows={2} value={availability} onChange={(event) => markDirty(setAvailability)(event.target.value)} />
          </div>
        </section>

        {/* Section D: Contact information */}
        <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Contact information</h2>
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
              <Label htmlFor="bookingUrl">Booking URL</Label>
              <Input id="bookingUrl" value={bookingUrl} onChange={(event) => markDirty(setBookingUrl)(event.target.value)} placeholder="https://" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="organisationWebsite">Website</Label>
              <Input id="organisationWebsite" value={organisationWebsite} onChange={(event) => markDirty(setOrganisationWebsite)(event.target.value)} placeholder="https://" />
            </div>
          </div>
          {organisationId ? (
            <p className="text-xs text-muted-foreground">
              These contact details belong to this professional directly — they are never copied automatically from the linked organisation.
            </p>
          ) : null}
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
              onChange={(event) => markDirty(setVerificationStatus)(event.target.value as SupportProfessional["verificationStatus"])}
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
              <Label htmlFor="verificationExpiryDate">Verification expiry date</Label>
              <Input id="verificationExpiryDate" type="date" value={verificationExpiryDate} onChange={(event) => markDirty(setVerificationExpiryDate)(event.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="verificationNotes">Verification notes (admin-only)</Label>
            <Textarea id="verificationNotes" rows={3} value={verificationNotes} onChange={(event) => markDirty(setVerificationNotes)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nextReviewDate">Review due date</Label>
            <Input id="nextReviewDate" type="date" value={nextReviewDate} onChange={(event) => markDirty(setNextReviewDate)(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="internalReviewNotes">Internal notes (admin-only, never exported)</Label>
            <Textarea id="internalReviewNotes" rows={3} value={internalReviewNotes} onChange={(event) => markDirty(setInternalReviewNotes)(event.target.value)} />
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
        <ProfessionalPreview record={previewRecord} localImageUrl={imageMarkedForRemoval ? undefined : pendingImagePreviewUrl} />
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
            <Button variant="destructive" onClick={() => router.push("/content/advocates-counsellors")}>
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
