"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { MachineKeyField } from "@/components/taxonomy/machine-key-field";
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
import { Input, Label, Textarea } from "@/components/ui/input";
import { useCrudList } from "@/hooks/use-crud-list";
import { createBaseFields, LOCAL_ADMIN_ACTOR, type ContentStatus } from "@/lib/models/base";
import { RESOURCE_CATEGORY_ACCENT_TOKENS, RESOURCE_CATEGORY_ICON_KEYS, type ResourceCategory } from "@/lib/models/resource-category";
import { getResourceCategoryBlockers } from "@/lib/taxonomy/eligibility";
import { isValidMachineKey, normalizeMachineKeyInput, suggestMachineKeyFromName } from "@/lib/taxonomy/machine-key";
import { RESOURCE_CATEGORY_ACCENT_LABELS, RESOURCE_CATEGORY_ICON_COMPONENTS, RESOURCE_CATEGORY_ICON_LABELS } from "@/lib/taxonomy/resource-icons";
import { isDuplicateMachineKey } from "@/lib/taxonomy/validation";
import { DuplicateMachineKeyError, VersionConflictError } from "@/lib/repositories/errors";

export function ResourceCategoryForm({ mode, initialRecord }: { mode: "create" | "edit"; initialRecord?: ResourceCategory | null }) {
  const { repository } = useAdminRepository();
  const router = useRouter();
  const existingAll = useCrudList((repo) => repo.resourceCategories) ?? [];

  const [record, setRecord] = useState<ResourceCategory | null>(initialRecord ?? null);
  const [name, setName] = useState(initialRecord?.name ?? "");
  const [machineKey, setMachineKey] = useState(initialRecord?.machineKey ?? "");
  const [machineKeyTouched, setMachineKeyTouched] = useState(mode === "edit");
  const [description, setDescription] = useState(initialRecord?.description ?? "");
  const [displayOrder, setDisplayOrder] = useState(initialRecord?.displayOrder ?? 0);
  const [iconKey, setIconKey] = useState<ResourceCategory["iconKey"]>(initialRecord?.iconKey ?? undefined);
  const [accentToken, setAccentToken] = useState<ResourceCategory["accentToken"]>(initialRecord?.accentToken ?? undefined);
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
    else router.push("/taxonomy/resource-categories");
  }

  async function handleSave(target: ContentStatus) {
    if (!repository || isSaving) return;
    setError(null);

    const normalizedKey = normalizeMachineKeyInput(machineKey);
    if (mode === "create") {
      if (!isValidMachineKey(normalizedKey)) {
        setKeyError("Enter a valid stable key: lowercase letters, numbers, and single underscores, starting with a letter.");
        return;
      }
      if (isDuplicateMachineKey(normalizedKey, existingAll)) {
        setKeyError("This stable key is already used by another resource category.");
        return;
      }
    }
    setKeyError(null);
    setIsSaving(true);

    try {
      const fields = {
        name: name.trim(),
        description: description.trim() || undefined,
        displayOrder,
        iconKey,
        accentToken,
        internalNotes: internalNotes.trim() || undefined,
      };

      let saved: ResourceCategory;
      if (!record) {
        // A brand-new record has no prior status to transition from, so it is
        // created directly at `target` — the status-graph guard (draft can
        // only reach ready_for_review or archived directly) only applies to
        // moving an *existing* record between states, not to picking a new
        // record's starting state.
        const draft: ResourceCategory = {
          ...createBaseFields({ status: target }),
          machineKey: normalizedKey,
          parentCategoryId: undefined,
          ...fields,
        };
        saved = await repository.resourceCategories.create(draft);
      } else {
        saved = await repository.resourceCategories.updateWithVersionCheck(record.id, fields, record.version, LOCAL_ADMIN_ACTOR);
      }

      if (saved.status !== target) {
        saved = await repository.resourceCategories.transitionStatus(saved.id, target, LOCAL_ADMIN_ACTOR);
      }

      setRecord(saved);
      setIsDirty(false);
      router.push(`/taxonomy/resource-categories/${saved.id}` as Route);
    } catch (err) {
      if (err instanceof DuplicateMachineKeyError) setKeyError(err.message);
      else if (err instanceof VersionConflictError) setError(err.message);
      else setError("Something went wrong while saving. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const previewRecord: ResourceCategory = {
    ...(record ?? { ...createBaseFields({ status: "draft" }), machineKey, parentCategoryId: undefined }),
    name: name.trim(),
    machineKey,
    description: description.trim() || undefined,
    displayOrder,
  } as ResourceCategory;
  const blockers = getResourceCategoryBlockers(
    previewRecord,
    existingAll.filter((r) => r.id !== record?.id)
  );

  const PreviewIcon = iconKey ? RESOURCE_CATEGORY_ICON_COMPONENTS[iconKey] : null;

  return (
    <div className="space-y-6">
      {error ? (
        <Alert tone="destructive" title="This record could not be saved" role="alert">
          {error}
        </Alert>
      ) : null}

      <div className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name shown to administrators and users</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setIsDirty(true);
            }}
          />
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
          <Label htmlFor="description">Short description</Label>
          <Textarea
            id="description"
            rows={2}
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setIsDirty(true);
            }}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="displayOrder">Display order</Label>
            <Input
              id="displayOrder"
              type="number"
              min={0}
              value={displayOrder}
              onChange={(event) => {
                setDisplayOrder(Math.max(0, Number(event.target.value) || 0));
                setIsDirty(true);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accentToken">Accent colour (optional)</Label>
            <select
              id="accentToken"
              className="h-10 w-full rounded-full border border-input bg-card px-4 text-sm text-foreground focus-visible:outline-none"
              value={accentToken ?? ""}
              onChange={(event) => {
                setAccentToken((event.target.value || undefined) as ResourceCategory["accentToken"]);
                setIsDirty(true);
              }}
            >
              <option value="">No accent</option>
              {RESOURCE_CATEGORY_ACCENT_TOKENS.map((token) => (
                <option key={token} value={token}>
                  {RESOURCE_CATEGORY_ACCENT_LABELS[token]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-foreground">Icon (optional)</legend>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
              <input
                type="radio"
                name="iconKey"
                checked={!iconKey}
                onChange={() => {
                  setIconKey(undefined);
                  setIsDirty(true);
                }}
              />
              No icon
            </label>
            {RESOURCE_CATEGORY_ICON_KEYS.map((key) => {
              const IconComponent = RESOURCE_CATEGORY_ICON_COMPONENTS[key];
              return (
                <label key={key} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                  <input
                    type="radio"
                    name="iconKey"
                    checked={iconKey === key}
                    onChange={() => {
                      setIconKey(key);
                      setIsDirty(true);
                    }}
                  />
                  <IconComponent size={16} aria-hidden="true" />
                  {RESOURCE_CATEGORY_ICON_LABELS[key]}
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Icons are chosen from the existing icon library only — arbitrary URLs or custom SVG markup are not supported.
          </p>
        </fieldset>

        {PreviewIcon ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Preview:</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1">
              <PreviewIcon size={16} aria-hidden="true" />
              {name.trim() || "Category name"}
            </span>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="internalNotes">Internal notes (optional)</Label>
          <Textarea
            id="internalNotes"
            rows={3}
            value={internalNotes}
            onChange={(event) => {
              setInternalNotes(event.target.value);
              setIsDirty(true);
            }}
          />
        </div>
      </div>

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
            <Button variant="destructive" onClick={() => router.push("/taxonomy/resource-categories")}>
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
