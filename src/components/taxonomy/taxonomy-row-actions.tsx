"use client";

import { IconDots } from "@tabler/icons-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CONTENT_STATUSES, LOCAL_ADMIN_ACTOR, type ContentStatus } from "@/lib/models/base";
import { isValidStatusTransition } from "@/lib/publishing/workflow";
import type { TaxonomyRepository } from "@/lib/repositories/admin-content-repository";
import type { TaxonomyEntity } from "@/lib/taxonomy/types";

const TARGET_LABEL: Record<ContentStatus, string> = {
  draft: "Move back to draft",
  ready_for_review: "Move to review",
  published: "Publish",
  needs_update: "Mark needs update",
  archived: "Archive",
};

/** Shared row-actions menu for all three taxonomy list tables. */
export function TaxonomyRowActions<T extends TaxonomyEntity>({
  record,
  repository,
  baseRoute,
  canPublish,
  onReplaceReferences,
}: {
  record: T;
  repository: TaxonomyRepository<T>;
  baseRoute: string;
  canPublish: boolean;
  onReplaceReferences?: () => void;
}) {
  const [pendingTarget, setPendingTarget] = useState<ContentStatus | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const targets = CONTENT_STATUSES.filter(
    (status) => status !== record.status && isValidStatusTransition(record.status, status)
  );

  async function runTransition(target: ContentStatus) {
    if (isWorking) return;
    setIsWorking(true);
    try {
      await repository.transitionStatus(record.id, target, LOCAL_ADMIN_ACTOR);
    } finally {
      setIsWorking(false);
      setPendingTarget(null);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Actions for ${record.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <IconDots size={16} aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem asChild>
            <Link href={`${baseRoute}/${record.id}` as Route}>View</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`${baseRoute}/${record.id}/edit` as Route}>Edit</Link>
          </DropdownMenuItem>
          {targets.map((target) => (
            <DropdownMenuItem
              key={target}
              disabled={(target === "published" || target === "ready_for_review") && !canPublish}
              onSelect={() => setPendingTarget(target)}
            >
              {TARGET_LABEL[target]}
            </DropdownMenuItem>
          ))}
          {onReplaceReferences ? (
            <DropdownMenuItem onSelect={onReplaceReferences}>Replace references</DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={pendingTarget !== null} onOpenChange={(open) => !open && setPendingTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingTarget ? TARGET_LABEL[pendingTarget] : ""}?</DialogTitle>
            <DialogDescription>This updates &quot;{record.name}&quot;.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
              onClick={() => setPendingTarget(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isWorking}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              onClick={() => pendingTarget && runTransition(pendingTarget)}
            >
              Confirm
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
