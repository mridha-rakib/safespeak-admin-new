"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";

import { StepGovernance } from "@/components/legislation/steps/step-governance";
import { StepLegalScope } from "@/components/legislation/steps/step-legal-scope";
import { StepReview } from "@/components/legislation/steps/step-review";
import { StepSource } from "@/components/legislation/steps/step-source";
import { StepUpload } from "@/components/legislation/steps/step-upload";
import { WizardStepper } from "@/components/legislation/wizard-stepper";
import { useAdminRepository } from "@/components/providers/repository-provider";
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
import {
  STEP_FIELDS,
  defaultFormValues,
  documentFormSchema,
  normalizeRelevantSections,
  normalizeTags,
  type DocumentFormValues,
} from "@/lib/legislation/document-form-schema";
import { LOCAL_ADMIN_ACTOR, type ContentStatus } from "@/lib/models/base";
import type { DocumentRecord } from "@/lib/models/document";
import { InvalidDeletionError, StatusTransitionError, VersionConflictError } from "@/lib/repositories/errors";

const STEPS = [
  { step: 1, label: "Upload" },
  { step: 2, label: "Source information" },
  { step: 3, label: "Legal scope" },
  { step: 4, label: "AI & governance" },
  { step: 5, label: "Review & save" },
];

export function DocumentFormWizard({
  mode,
  initialDocument,
}: {
  mode: "create" | "edit";
  initialDocument?: DocumentRecord | null;
}) {
  const { repository } = useAdminRepository();
  const router = useRouter();

  const [document, setDocument] = useState<DocumentRecord | null>(initialDocument ?? null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const form = useForm<DocumentFormValues>({
    // Cast needed because pnpm's isolated peer-dependency store for
    // @hookform/resolvers resolves a structurally-identical but nominally
    // distinct `react-hook-form` module instance (confirmed to be a symlink
    // to the exact same files) — this is a type-identity artifact, not a
    // real incompatibility.
    resolver: zodResolver(documentFormSchema) as Resolver<DocumentFormValues>,
    defaultValues: defaultFormValues(initialDocument),
    mode: "onSubmit",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (form.formState.isDirty) {
        event.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form.formState.isDirty]);

  function goToListWithoutSaving() {
    router.push("/content/knowledge-legislation");
  }

  function handleCancel() {
    if (form.formState.isDirty) {
      setCancelConfirmOpen(true);
    } else {
      goToListWithoutSaving();
    }
  }

  async function handleNext() {
    const fields = STEP_FIELDS[currentStep];
    if (fields && fields.length > 0) {
      const valid = await form.trigger(fields);
      if (!valid) return;
    }
    if (currentStep === 1 && !document) return; // must finish upload before continuing on create
    setCurrentStep((step) => Math.min(step + 1, STEPS.length));
  }

  function handleBack() {
    setCurrentStep((step) => Math.max(step - 1, 1));
  }

  async function handleSave(target: ContentStatus) {
    // Guards against a rapid double-click firing twice before the disabled
    // attribute re-renders — `isSaving` itself only updates on next render.
    if (!repository || !document || isSaving) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const values = form.getValues();
      const patch: Partial<DocumentRecord> = {
        ...values,
        relevantSections: normalizeRelevantSections(values.relevantSections),
        tags: normalizeTags(values.tags),
        sourceUrl: values.sourceUrl || undefined,
      };

      let updated = await repository.documents.updateWithVersionCheck(
        document.id,
        patch,
        document.version,
        LOCAL_ADMIN_ACTOR
      );

      if (updated.status !== target) {
        updated = await repository.documents.transitionStatus(document.id, target, LOCAL_ADMIN_ACTOR);
      }

      setDocument(updated);
      form.reset(defaultFormValues(updated));
      router.push(`/content/knowledge-legislation/${document.id}`);
    } catch (error) {
      if (error instanceof VersionConflictError || error instanceof StatusTransitionError || error instanceof InvalidDeletionError) {
        setSaveError(error.message);
      } else {
        setSaveError("Something went wrong while saving. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  const previewDocument: DocumentRecord | null = document
    ? { ...document, ...form.watch() }
    : null;

  return (
    <FormProvider {...form}>
      <div className="space-y-6">
        <WizardStepper steps={STEPS} currentStep={currentStep} />

        {saveError ? (
          <Alert tone="destructive" title="This document could not be saved" role="alert">
            {saveError}
          </Alert>
        ) : null}

        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          {currentStep === 1 ? (
            <StepUpload
              repository={repository}
              actor={LOCAL_ADMIN_ACTOR}
              mode={mode}
              document={document}
              onCreated={(outcome) => {
                if (outcome.document) {
                  setDocument(outcome.document);
                  form.reset(defaultFormValues(outcome.document));
                }
              }}
              onReplaced={(outcome) => {
                if (outcome.document) setDocument(outcome.document);
              }}
            />
          ) : null}
          {currentStep === 2 ? <StepSource /> : null}
          {currentStep === 3 ? <StepLegalScope /> : null}
          {currentStep === 4 ? <StepGovernance /> : null}
          {currentStep === 5 && previewDocument ? (
            <StepReview previewDocument={previewDocument} isSaving={isSaving} onSave={handleSave} />
          ) : null}
        </div>

        {currentStep < 5 ? (
          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {currentStep > 1 ? (
                <Button type="button" variant="outline" onClick={handleBack}>
                  Back
                </Button>
              ) : null}
              <Button type="button" onClick={handleNext} disabled={currentStep === 1 && !document}>
                Continue
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-start">
            <Button type="button" variant="outline" onClick={handleBack}>
              Back and edit
            </Button>
          </div>
        )}
      </div>

      <Dialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              You have unsaved changes on this form. Leaving now will discard them. This does not affect
              anything already saved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelConfirmOpen(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={goToListWithoutSaving}>
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormProvider>
  );
}
