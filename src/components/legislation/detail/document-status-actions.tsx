"use client";

import { useState } from "react";

import { useAdminRepository } from "@/components/providers/repository-provider";
import { Button, type ButtonVariant } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";
import { getPublicationBlockers } from "@/lib/legislation/readiness";
import { CONTENT_STATUSES, LOCAL_ADMIN_ACTOR, type ContentStatus } from "@/lib/models/base";
import type { DocumentRecord } from "@/lib/models/document";
import { InvalidDeletionError, StatusTransitionError } from "@/lib/repositories/errors";
import { isValidStatusTransition } from "@/lib/publishing/workflow";

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

export function DocumentStatusActions({ document, onChanged }: { document: DocumentRecord; onChanged?: (doc: DocumentRecord) => void }) {
  const { repository } = useAdminRepository();
  const [pendingTarget, setPendingTarget] = useState<ContentStatus | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const availableTargets = CONTENT_STATUSES.filter(
    (status) => status !== document.status && isValidStatusTransition(document.status, status)
  );
  const blockers = getPublicationBlockers(document);

  async function runTransition(target: ContentStatus) {
    if (!repository || isWorking) return;
    setIsWorking(true);
    setError(null);
    try {
      const updated = await repository.documents.transitionStatus(document.id, target, LOCAL_ADMIN_ACTOR);
      onChanged?.(updated);
    } catch (err) {
      setError(err instanceof StatusTransitionError ? err.message : "This status change could not be completed.");
    } finally {
      setIsWorking(false);
      setPendingTarget(null);
    }
  }

  async function runDelete() {
    if (!repository || isWorking) return;
    setIsWorking(true);
    setError(null);
    try {
      await repository.documents.deleteDraft(document.id, LOCAL_ADMIN_ACTOR);
      setDeleteDialogOpen(false);
      window.location.href = "/content/knowledge-legislation";
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
            disabled={isWorking || (target === "published" && blockers.length > 0)}
            onClick={() => setPendingTarget(target)}
          >
            {STATUS_ACTION_LABEL[target]}
          </Button>
        ))}
        {document.status === "draft" ? (
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
                ? "This makes the document visible as published content. It will only be included in the AI-ready export if AI use is also allowed."
                : pendingTarget === "archived"
                  ? "Archiving removes this document from the Published Content Bundle. It stays in local storage and can be restored to draft later."
                  : "This updates the document's status."}
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
              This permanently removes the draft, its local PDF, and its local chunk previews from this
              browser. This cannot be undone locally. Only draft documents can be deleted this way —
              published or archived content must be archived instead.
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
