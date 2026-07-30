"use client";

import { IconDots } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";

import { useAdminRepository } from "@/components/providers/repository-provider";
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
import { getPublicationBlockers } from "@/lib/legislation/readiness";
import { LOCAL_ADMIN_ACTOR, type ContentStatus } from "@/lib/models/base";
import type { DocumentRecord } from "@/lib/models/document";
import { isValidStatusTransition } from "@/lib/publishing/workflow";

export function DocumentRowActions({ document }: { document: DocumentRecord }) {
  const { repository } = useAdminRepository();
  const [pendingAction, setPendingAction] = useState<{ target: ContentStatus } | { kind: "delete" } | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const canPublish = getPublicationBlockers(document).length === 0;
  const targets: ContentStatus[] = (["draft", "ready_for_review", "published", "needs_update", "archived"] as ContentStatus[]).filter(
    (status) => status !== document.status && isValidStatusTransition(document.status, status)
  );

  async function runTransition(target: ContentStatus) {
    if (!repository || isWorking) return;
    setIsWorking(true);
    try {
      await repository.documents.transitionStatus(document.id, target, LOCAL_ADMIN_ACTOR);
    } finally {
      setIsWorking(false);
      setPendingAction(null);
    }
  }

  async function runDelete() {
    if (!repository || isWorking) return;
    setIsWorking(true);
    try {
      await repository.documents.deleteDraft(document.id, LOCAL_ADMIN_ACTOR);
    } finally {
      setIsWorking(false);
      setPendingAction(null);
    }
  }

  const TARGET_LABEL: Record<ContentStatus, string> = {
    draft: "Move back to draft",
    ready_for_review: "Move to review",
    published: "Publish",
    needs_update: "Mark needs update",
    archived: "Archive",
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Actions for ${document.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <IconDots size={16} aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem asChild>
            <Link href={`/content/knowledge-legislation/${document.id}`}>View</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/content/knowledge-legislation/${document.id}/edit`}>Edit</Link>
          </DropdownMenuItem>
          {targets.map((target) => (
            <DropdownMenuItem
              key={target}
              disabled={target === "published" && !canPublish}
              onSelect={() => setPendingAction({ target })}
            >
              {TARGET_LABEL[target]}
            </DropdownMenuItem>
          ))}
          {document.status === "draft" ? (
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
                ? "This permanently removes the draft, its local PDF, and its local chunks. This cannot be undone locally."
                : `This updates "${document.title}".`}
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
