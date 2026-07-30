"use client";

import { IconCircleCheck, IconFlask2, IconLoader2, IconRefresh } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";

import { useAdminRepository } from "@/components/providers/repository-provider";
import { Alert } from "@/components/ui/alert";
import { buttonVariants, Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LOCAL_ADMIN_ACTOR } from "@/lib/models/base";
import { retryExtraction } from "@/lib/legislation/document-extraction-service";
import type { DocumentRecord } from "@/lib/models/document";

export function ProcessingIssuesTab({ documents }: { documents: DocumentRecord[] | undefined }) {
  const { repository } = useAdminRepository();
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});

  const issueDocs = documents?.filter((d) => d.processingStatus === "processing_issue") ?? [];

  async function handleRetry(documentId: string) {
    if (!repository || retryingId) return; // prevent simultaneous duplicate retries
    setRetryingId(documentId);
    const outcome = await retryExtraction(repository, documentId, LOCAL_ADMIN_ACTOR);
    setResults((prev) => ({
      ...prev,
      [documentId]: {
        success: outcome.success,
        message: outcome.success ? "Retry succeeded — local text and chunks were generated." : (outcome.error ?? "Retry failed."),
      },
    }));
    setRetryingId(null);
  }

  if (documents === undefined) return null;

  if (issueDocs.length === 0) {
    return (
      <EmptyState
        icon={IconFlask2}
        title="No processing issues"
        description="Documents that fail local extraction (encrypted, empty, or unreadable files) will be listed here."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {issueDocs.map((doc) => {
        const result = results[doc.id];
        const isRetrying = retryingId === doc.id;
        return (
          <li key={doc.id} className="rounded-xl border border-warning/30 bg-warning/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{doc.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {doc.processingIssue ?? "This document could not be processed locally."}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={Boolean(retryingId)}
                  onClick={() => void handleRetry(doc.id)}
                >
                  {isRetrying ? (
                    <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <IconRefresh size={14} aria-hidden="true" />
                  )}
                  Retry extraction
                </Button>
                <Link href={`/content/knowledge-legislation/${doc.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Replace PDF
                </Link>
                <Link href={`/content/knowledge-legislation/${doc.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  View
                </Link>
              </div>
            </div>
            {result ? (
              <Alert tone={result.success ? "success" : "destructive"} title={result.success ? "Retry succeeded" : "Retry failed"} className="mt-3">
                <span className="inline-flex items-center gap-1.5">
                  {result.success ? <IconCircleCheck size={14} aria-hidden="true" /> : null}
                  {result.message}
                </span>
              </Alert>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
