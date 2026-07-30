"use client";

import { useState } from "react";

import { TagListInput } from "@/components/legislation/tag-list-input";
import { useAdminRepository } from "@/components/providers/repository-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { useTaxonomyDataBundle } from "@/hooks/use-taxonomy-data-bundle";
import type { MockIncidentContext, PublishedMockContentBundle } from "@/lib/contract/published-content-contract";
import { AUSTRALIAN_JURISDICTIONS, type AustralianJurisdiction } from "@/lib/jurisdictions";
import { buildPreviewBundleData } from "@/lib/matching-rules/build-preview-bundle";
import { runMockMatchingDebug, type MockMatchingDebugResult } from "@/lib/matching-rules/engine";
import { ASSISTANT_TOPIC_KEYS, ASSISTANT_TOPIC_LABEL, type AssistantTopicKey } from "@/lib/models/assistant-topic";
import { createAuditEvent } from "@/lib/models/audit-event";
import { LOCAL_ADMIN_ACTOR } from "@/lib/models/base";
import type { MatchingRule } from "@/lib/models/matching-rule";
import { TRIAGE_URGENCY_LEVELS, type TriageUrgencyLevel } from "@/lib/models/triage-label";

const URGENCY_LABEL: Record<TriageUrgencyLevel, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  critical: "Critical",
};

const selectClass = "h-10 w-full rounded-full border border-input bg-card px-4 text-sm text-foreground focus-visible:outline-none";

const RECOMMENDATION_KIND_LABEL = {
  microcards: "Microcards",
  rightsContent: "Rights & legal information",
  supportOrganisations: "Support organisations",
  supportProfessionals: "Advocates & counsellors",
  reportingDestinations: "Reporting destinations",
  legislationSources: "Legislation sources",
} as const;

type RecommendationKindKey = keyof typeof RECOMMENDATION_KIND_LABEL;

function findRecordName(bundle: PublishedMockContentBundle["data"], kind: RecommendationKindKey, recordId: string): string {
  switch (kind) {
    case "microcards":
      return bundle.microcards.find((r) => r.id === recordId)?.title ?? recordId;
    case "rightsContent":
      return bundle.rightsContent.find((r) => r.id === recordId)?.title ?? recordId;
    case "supportOrganisations":
      return bundle.supportOrganisations.find((r) => r.id === recordId)?.name ?? recordId;
    case "supportProfessionals":
      return bundle.supportProfessionals.find((r) => r.id === recordId)?.fullName ?? recordId;
    case "reportingDestinations":
      return bundle.reportingDestinations.find((r) => r.id === recordId)?.name ?? recordId;
    case "legislationSources":
      return bundle.legislationSources.find((r) => r.id === recordId)?.title ?? recordId;
  }
}

/**
 * Mock-only, deterministic — runs the ONE matching engine
 * (lib/matching-rules/engine.ts, `runMockMatchingDebug`) against a preview
 * bundle built from the CURRENT LIVE admin content
 * (lib/matching-rules/build-preview-bundle.ts), never a simplified
 * stand-in algorithm. An explicit "Run test match" button rather than
 * live-recompute-on-change, matching this app's general preference for
 * explicit save/run actions over implicit background recomputation.
 */
export function TestMatchingPanel({ record }: { record: MatchingRule }) {
  const { repository } = useAdminRepository();
  const dataBundle = useTaxonomyDataBundle();

  const [assistantTopic, setAssistantTopic] = useState<AssistantTopicKey>(record.topicKeys[0] ?? "general_assistant");
  const [incidentTypeIds, setIncidentTypeIds] = useState<string[]>(record.incidentTypeIds);
  const [triageLabelIds, setTriageLabelIds] = useState<string[]>(record.triageLabelIds);
  const [jurisdiction, setJurisdiction] = useState<AustralianJurisdiction | undefined>(record.jurisdictions[0]);
  const [urgency, setUrgency] = useState<TriageUrgencyLevel | undefined>(record.urgencyLevels[0]);
  const [supportNeeds, setSupportNeeds] = useState<string[]>(record.supportNeeds);

  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MockMatchingDebugResult | null>(null);
  const [previewBundle, setPreviewBundle] = useState<PublishedMockContentBundle["data"] | null>(null);

  async function handleRun() {
    if (!repository || isRunning) return;
    setIsRunning(true);
    setError(null);
    try {
      const bundleData = await buildPreviewBundleData(repository);
      const context: MockIncidentContext = {
        assistantTopic,
        incidentTypeIds,
        triageLabelIds,
        jurisdiction,
        urgency,
        supportNeeds,
        mockScenarioId: "admin-test-matching",
        contextVersion: 1,
      };
      const debugResult = runMockMatchingDebug(bundleData, context);
      setPreviewBundle(bundleData);
      setResult(debugResult);

      // No AuditAction fits "ran a read-only preview" exactly (see
      // lib/models/audit-event.ts — created/updated/status_changed/deleted/
      // demo_data_seeded/demo_data_reset/bundle_exported), and the
      // generic PublishableContentRepository factory's updateWithVersionCheck
      // is the only other precedent for a non-status-change audit entry, so
      // "updated" (the closest general-purpose action) is used here with an
      // explicit, honest summary rather than inventing a new AuditAction.
      await repository.auditEvents.append(
        createAuditEvent({
          entityType: "matching_rule",
          entityId: record.id,
          action: "updated",
          actor: LOCAL_ADMIN_ACTOR,
          summary: `Ran Test Matching preview for "${record.name}" (no fields changed).`,
          isDemo: record.isDemo,
        })
      );
    } catch {
      setError("The test matching preview could not be run. Please try again.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Test matching</h2>
        <p className="text-xs text-muted-foreground">
          Deterministic matching preview — this shows what the mock matching engine would recommend for the context below.
          It never calls an AI model, and this is not the real production matching service. It runs against the current
          live admin content (anything currently published), not a previously exported bundle.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="test-topic">Assistant topic</Label>
          <select
            id="test-topic"
            className={selectClass}
            value={assistantTopic}
            onChange={(event) => setAssistantTopic(event.target.value as AssistantTopicKey)}
          >
            {ASSISTANT_TOPIC_KEYS.map((key) => (
              <option key={key} value={key}>
                {ASSISTANT_TOPIC_LABEL[key]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="test-jurisdiction">Jurisdiction</Label>
          <select
            id="test-jurisdiction"
            className={selectClass}
            value={jurisdiction ?? ""}
            onChange={(event) => setJurisdiction((event.target.value || undefined) as AustralianJurisdiction | undefined)}
          >
            <option value="">Unknown / not set</option>
            {AUSTRALIAN_JURISDICTIONS.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="test-urgency">Urgency</Label>
          <select
            id="test-urgency"
            className={selectClass}
            value={urgency ?? ""}
            onChange={(event) => setUrgency((event.target.value || undefined) as TriageUrgencyLevel | undefined)}
          >
            <option value="">Unknown / not set</option>
            {TRIAGE_URGENCY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {URGENCY_LABEL[level]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">Incident types</legend>
        {(dataBundle?.incidentTypes ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No incident types exist yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(dataBundle?.incidentTypes ?? []).map((incidentType) => {
              const checked = incidentTypeIds.includes(incidentType.id);
              return (
                <label key={incidentType.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      setIncidentTypeIds(
                        event.target.checked ? [...incidentTypeIds, incidentType.id] : incidentTypeIds.filter((id) => id !== incidentType.id)
                      )
                    }
                  />
                  {incidentType.name}
                </label>
              );
            })}
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">Triage labels</legend>
        {(dataBundle?.triageLabels ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No triage labels exist yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(dataBundle?.triageLabels ?? []).map((label) => {
              const checked = triageLabelIds.includes(label.id);
              return (
                <label key={label.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      setTriageLabelIds(event.target.checked ? [...triageLabelIds, label.id] : triageLabelIds.filter((id) => id !== label.id))
                    }
                  />
                  {label.name}
                </label>
              );
            })}
          </div>
        )}
      </fieldset>

      <TagListInput label="Support needs" placeholder="e.g. housing" values={supportNeeds} onChange={setSupportNeeds} />

      {error ? (
        <Alert tone="destructive" title="This test run failed" role="alert">
          {error}
        </Alert>
      ) : null}

      <Button type="button" disabled={isRunning} onClick={() => void handleRun()}>
        {isRunning ? "Running…" : "Run test match"}
      </Button>

      {result && previewBundle ? (
        <div className="space-y-5 border-t border-border pt-5">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-foreground">Triggered rules</p>
            {result.triggeredRuleIds.length === 0 ? (
              <p className="text-xs text-muted-foreground">No rules triggered for this context.</p>
            ) : (
              <ul className="space-y-1">
                {result.triggeredRuleIds.map((ruleId) => {
                  const rule = previewBundle.matchingRules.find((r) => r.id === ruleId);
                  const isThisRule = ruleId === record.id;
                  return (
                    <li key={ruleId} className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge tone={isThisRule ? "success" : "primary"}>{isThisRule ? "This rule" : "Rule"}</Badge>
                      <span className="text-foreground">{rule?.name ?? ruleId}</span>
                      <span className="text-xs text-muted-foreground">priority {rule?.priority ?? "?"}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-foreground">Rules that did not match this context</p>
            {result.notTriggeredRuleIds.length === 0 ? (
              <p className="text-xs text-muted-foreground">Every published, enabled rule triggered.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {result.notTriggeredRuleIds.map((ruleId) => {
                  const rule = previewBundle.matchingRules.find((r) => r.id === ruleId);
                  return (
                    <li key={ruleId}>
                      <Badge tone="neutral">{rule?.name ?? ruleId}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Recommendations</p>
            {(Object.keys(RECOMMENDATION_KIND_LABEL) as RecommendationKindKey[]).map((kind) => {
              const items = result.recommendations[kind];
              return (
                <div key={kind} className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{RECOMMENDATION_KIND_LABEL[kind]}</p>
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground">None.</p>
                  ) : (
                    <ul className="space-y-2">
                      {items.map((item) => (
                        <li key={item.recordId} className="rounded-lg border border-border p-3 text-sm">
                          <p className="font-medium text-foreground">{findRecordName(previewBundle, kind, item.recordId)}</p>
                          <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                            {item.reasons.map((reason, index) => (
                              <li key={`${reason.ruleId}-${reason.code}-${index}`}>{reason.detail}</li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {result.excludedRelationships.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-foreground">Excluded relationships</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {result.excludedRelationships.map((excluded, index) => (
                  <li key={`${excluded.ruleId}-${excluded.recordId}-${index}`}>
                    &quot;{excluded.ruleName}&quot; referenced {excluded.kind.replace(/_/g, " ")} {excluded.recordId}: {excluded.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
