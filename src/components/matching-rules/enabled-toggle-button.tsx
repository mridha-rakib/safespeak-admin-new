"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createAuditEvent } from "@/lib/models/audit-event";
import { LOCAL_ADMIN_ACTOR } from "@/lib/models/base";
import type { MatchingRule } from "@/lib/models/matching-rule";
import type { AdminContentRepository } from "@/lib/repositories/admin-content-repository";
import { VersionConflictError } from "@/lib/repositories/errors";

/**
 * Enable/Disable is a boolean flag orthogonal to the publish-workflow status
 * (a rule can be published-and-enabled or published-and-disabled — the mock
 * matching engine only ever executes published AND enabled rules, see
 * lib/matching-rules/engine.ts "eligibleRules"). Neither
 * components/content/publishable-row-actions.tsx nor
 * publishable-status-actions.tsx know about it — both are generic across
 * every `PublishableContentRepository<T>` domain, most of which have no
 * `enabled` field at all — so this is a small Matching-Rule-specific action
 * rather than a generalisation of either shared component.
 *
 * The generic `createPublishableContentRepository` factory's
 * `updateWithVersionCheck` does not append its own audit event (confirmed by
 * reading lib/repositories/indexeddb-admin-content-repository.ts — only
 * `create`, `transitionStatus`, and `deleteDraft` do), so this appends one
 * explicitly at the UI layer rather than silently leaving Enable/Disable out
 * of the audit trail.
 */
export function EnabledToggleButton({
  record,
  repository,
  size = "sm",
  onChanged,
}: {
  record: MatchingRule;
  repository: AdminContentRepository;
  size?: "sm" | "default";
  onChanged?: (updated: MatchingRule) => void;
}) {
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (isWorking) return;
    setIsWorking(true);
    setError(null);
    const nextEnabled = !record.enabled;
    try {
      const updated = await repository.matchingRules.updateWithVersionCheck(
        record.id,
        { enabled: nextEnabled },
        record.version,
        LOCAL_ADMIN_ACTOR
      );
      await repository.auditEvents.append(
        createAuditEvent({
          entityType: "matching_rule",
          entityId: record.id,
          action: "updated",
          actor: LOCAL_ADMIN_ACTOR,
          summary: `"${record.name}" was ${nextEnabled ? "enabled" : "disabled"}.`,
          isDemo: record.isDemo,
        })
      );
      onChanged?.(updated);
    } catch (err) {
      setError(err instanceof VersionConflictError ? err.message : "This could not be updated.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button type="button" variant="outline" size={size} disabled={isWorking} onClick={() => void toggle()}>
        {record.enabled ? "Disable" : "Enable"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
