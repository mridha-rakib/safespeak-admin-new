"use client";

import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button, type ButtonVariant } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CONTENT_STATUSES, LOCAL_ADMIN_ACTOR, type ContentStatus } from "@/lib/models/base";
import { isValidStatusTransition } from "@/lib/publishing/workflow";
import { InvalidDeletionError, StatusTransitionError } from "@/lib/repositories/errors";
import type { TaxonomyRepository } from "@/lib/repositories/admin-content-repository";
import type { TaxonomyEntity } from "@/lib/taxonomy/types";

const STATUS_ACTION_LABEL: Record<ContentStatus, string> = {
  draft: "Move back to draft",
  ready_for_review: "Move to ready for review",
  published: "Publish",
  needs_update: "Mark needs update",
  archived: "Archive",
};

const STATUS_ACTION_VARIANT: Record<ContentStatus, ButtonVariant> = {
  draft: "outline",
  ready_for_review: "secondary",
  published: "default",
  needs_update: "outline",
  archived: "destructive",
};

/** Shared by Incident Type, Triage Label, and Resource Category detail pages — see document-status-actions.tsx for the Knowledge & Legislation equivalent this mirrors. */
export function TaxonomyStatusActions<T extends TaxonomyEntity>({
  record,
  repository,
  blockers,
  onChanged,
  onDeleted,
}: {
  record: T;
  repository: TaxonomyRepository<T>;
  /** Precomputed by the caller (needs the full existing-records list for duplicate checks) — see lib/taxonomy/eligibility.ts. */
  blockers: string[];
  onChanged?: (updated: T) => void;
  onDeleted?: () => void;
}) {
  const [pendingTarget, setPendingTarget] = useState<ContentStatus | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const availableTargets = CONTENT_STATUSES.filter(
    (status) => status !== record.status && isValidStatusTransition(record.status, status)
  );

  async function runTransition(target: ContentStatus) {
    if (isWorking) return;
    setIsWorking(true);
    setError(null);
    try {
      const updated = await repository.transitionStatus(record.id, target, LOCAL_ADMIN_ACTOR);
      onChanged?.(updated);
    } catch (err) {
      setError(err instanceof StatusTransitionError ? err.message : "This status change could not be completed.");
    } finally {
      setIsWorking(false);
      setPendingTarget(null);
    }
  }

  async function runDelete() {
    if (isWorking) return;
    setIsWorking(true);
    setError(null);
    try {
      await repository.deleteDraft(record.id, LOCAL_ADMIN_ACTOR);
      setDeleteDialogOpen(false);
      onDeleted?.();
    } catch (err) {
      setError(err instanceof InvalidDeletionError ? err.message : "This draft could not be deleted.");
      setIsWorking(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <Alert tone="destructive" title="This action could not be completed" role="alert">
          {error}
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {availableTargets.map((target) => (
          <Button
            key={target}
            variant={STATUS_ACTION_VARIANT[target]}
            size="sm"
            disabled={isWorking || ((target === "published" || target === "ready_for_review") && blockers.length > 0)}
            onClick={() => setPendingTarget(target)}
          >
            {STATUS_ACTION_LABEL[target]}
          </Button>
        ))}
        {record.status === "draft" ? (
          <Button variant="destructive" size="sm" disabled={isWorking} onClick={() => setDeleteDialogOpen(true)}>
            Delete draft
          </Button>
        ) : null}
      </div>

      <Dialog open={pendingTarget !== null} onOpenChange={(open) => !open && setPendingTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingTarget ? STATUS_ACTION_LABEL[pendingTarget] : ""}?</DialogTitle>
            <DialogDescription>
              {pendingTarget === "published"
                ? "This makes the record visible as published taxonomy. It will be included in the Published Content Bundle."
                : pendingTarget === "archived"
                  ? "Archiving excludes this record from the Published Content Bundle and from create/edit selection lists. It stays in local storage and can be restored to draft later."
                  : `This updates "${record.name}".`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingTarget(null)}>
              Cancel
            </Button>
            <Button onClick={() => pendingTarget && runTransition(pendingTarget)} disabled={isWorking}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this draft?</DialogTitle>
            <DialogDescription>
              This permanently removes &quot;{record.name}&quot; from local storage. This cannot be undone locally.
              Only unreferenced draft records can be deleted this way — used, published, or archived
              records must be archived or replaced instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={runDelete} disabled={isWorking}>
              Delete draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
