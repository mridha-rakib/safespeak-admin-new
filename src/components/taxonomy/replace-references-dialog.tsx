"use client";

import { useState } from "react";

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
import { LOCAL_ADMIN_ACTOR } from "@/lib/models/base";
import type { TaxonomyRepository } from "@/lib/repositories/admin-content-repository";
import { InvalidReplacementTargetError } from "@/lib/repositories/errors";
import type { UsageSummary } from "@/lib/taxonomy/dependency-service";
import type { TaxonomyEntity } from "@/lib/taxonomy/types";

/** Shared by all three taxonomy details/list pages — see README "Replace References workflow." */
export function ReplaceReferencesDialog<T extends TaxonomyEntity>({
  open,
  onOpenChange,
  source,
  usage,
  candidates,
  repository,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: T;
  usage: UsageSummary;
  candidates: T[];
  repository: TaxonomyRepository<T>;
  onCompleted?: () => void;
}) {
  const [targetId, setTargetId] = useState<string>("");
  const [archiveAfter, setArchiveAfter] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ updatedRecordCount: number } | null>(null);

  function reset() {
    setTargetId("");
    setArchiveAfter(true);
    setError(null);
    setResult(null);
  }

  async function handleConfirm() {
    if (isWorking || !targetId) return; // guards against a duplicate concurrent replacement
    setIsWorking(true);
    setError(null);
    try {
      const outcome = await repository.replaceReferences(source.id, targetId, LOCAL_ADMIN_ACTOR, archiveAfter);
      setResult(outcome);
      onCompleted?.();
    } catch (err) {
      setError(err instanceof InvalidReplacementTargetError ? err.message : "This replacement could not be completed.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replace references to &quot;{source.name}&quot;</DialogTitle>
          <DialogDescription>
            {usage.totalCount} record{usage.totalCount === 1 ? "" : "s"} currently reference this item.
            Choose a replacement of the same type — every reference will be repointed to it.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <Alert tone="success" title="References replaced">
            {result.updatedRecordCount} record{result.updatedRecordCount === 1 ? "" : "s"} now reference the
            replacement instead.
          </Alert>
        ) : (
          <div className="space-y-4">
            <ul className="space-y-1 text-xs text-muted-foreground">
              {usage.byEntityType.map((group) => (
                <li key={group.entityType}>
                  {group.entityLabel}: {group.count}
                </li>
              ))}
            </ul>

            <div className="space-y-1.5">
              <label htmlFor="replacement-target" className="text-sm font-semibold text-foreground">
                Replacement
              </label>
              <select
                id="replacement-target"
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
                className="h-10 w-full rounded-full border border-input bg-card px-4 text-sm text-foreground focus-visible:outline-none"
              >
                <option value="">Select a replacement…</option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </select>
              {candidates.length === 0 ? (
                <p className="text-xs text-warning">No other active record of this type is available as a replacement yet.</p>
              ) : null}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={archiveAfter} onChange={(event) => setArchiveAfter(event.target.checked)} />
              Archive &quot;{source.name}&quot; once references are replaced
            </label>

            {error ? (
              <Alert tone="destructive" title="Replacement failed" role="alert">
                {error}
              </Alert>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result ? (
            <Button onClick={handleConfirm} disabled={isWorking || !targetId}>
              {isWorking ? "Replacing…" : "Confirm replacement"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
