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
import { LOCAL_ADMIN_ACTOR, type ContentStatus } from "@/lib/models/base";
import type { PublishableContentRepository } from "@/lib/repositories/admin-content-repository";
import { isValidStatusTransition } from "@/lib/publishing/workflow";

const TARGET_LABEL: Record<ContentStatus, string> = {
  draft: "Move back to draft",
  ready_for_review: "Move to review",
  published: "Publish",
  needs_update: "Mark needs update",
  archived: "Archive",
};

interface PublishableRecord {
  id: string;
  status: ContentStatus;
}

/**
 * The `PublishableContentRepository<T>` counterpart to
 * components/legislation/detail/document-row-actions.tsx — shared by every
 * publishable-content list-page row menu. `label` is the record's own
 * display name (`title`/`name`/`fullName` depending on the domain).
 */
export function PublishableRowActions<T extends PublishableRecord>({
  record,
  label,
  repository,
  baseRoute,
  canPublish,
}: {
  record: T;
  label: string;
  repository: PublishableContentRepository<T>;
  baseRoute: string;
  canPublish: boolean;
}) {
  const [pendingAction, setPendingAction] = useState<{ target: ContentStatus } | { kind: "delete" } | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const targets: ContentStatus[] = (["draft", "ready_for_review", "published", "needs_update", "archived"] as ContentStatus[]).filter(
    (status) => status !== record.status && isValidStatusTransition(record.status, status)
  );

  async function runTransition(target: ContentStatus) {
    if (isWorking) return;
    setIsWorking(true);
    try {
      await repository.transitionStatus(record.id, target, LOCAL_ADMIN_ACTOR);
    } finally {
      setIsWorking(false);
      setPendingAction(null);
    }
  }

  async function runDelete() {
    if (isWorking) return;
    setIsWorking(true);
    try {
      await repository.deleteDraft(record.id, LOCAL_ADMIN_ACTOR);
    } finally {
      setIsWorking(false);
      setPendingAction(null);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Actions for ${label}`}
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
              onSelect={() => setPendingAction({ target })}
            >
              {TARGET_LABEL[target]}
            </DropdownMenuItem>
          ))}
          {record.status === "draft" ? (
            <DropdownMenuItem destructive onSelect={() => setPendingAction({ kind: "delete" })}>
              Delete draft
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={pendingAction !== null} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction && "kind" in pendingAction ? "Delete this draft?" : `${pendingAction ? TARGET_LABEL[pendingAction.target] : ""}?`}
            </DialogTitle>
            <DialogDescription>
              {pendingAction && "kind" in pendingAction
                ? "This permanently removes the draft. This cannot be undone locally."
                : `This updates "${label}".`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
              onClick={() => setPendingAction(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isWorking}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              onClick={() => {
                if (!pendingAction) return;
                if ("kind" in pendingAction) void runDelete();
                else void runTransition(pendingAction.target);
              }}
            >
              Confirm
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
