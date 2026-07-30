/**
 * Relative (not `@/…`) import deliberately — this file is physically copied
 * byte-for-byte into `safespeak-frontend/src/lib/matching-rules/engine.ts`
 * (see `scripts/generate-mock-bundle.ts`), which has its own, unrelated
 * `@/*` alias root. A relative import resolves identically in both apps as
 * long as the sibling `../contract/published-content-contract.ts` file
 * exists at the same relative path in both — which the same script
 * guarantees by copying both files together, preserving this layout.
 */
import type {
  MatchReasonCode,
  MockIncidentContext,
  MockMatchedRecommendation,
  MockMatchingResult,
  MockMatchReason,
  PublishedMatchingRule,
  PublishedMockContentBundle,
  RecommendationKind,
} from "../contract/published-content-contract";

/**
 * The ONE deterministic mock matching engine. This module is a pure
 * function of (bundle data, incident context) → result: no randomness, no
 * generative AI, no external API, no free-text semantic matching, no
 * embeddings, and no reliance on array iteration order as an implicit rank
 * (every sort is by an explicit, documented key with a stable-id tie-break).
 *
 * This exact file is physically copied (byte-for-byte, via
 * `scripts/generate-mock-bundle.ts`) into
 * `safespeak-frontend/src/lib/mock-contract/matching-engine.ts` so the
 * frontend Triage page and the admin "Test Matching" preview panel run
 * IDENTICAL matching logic — see docs/ARCHITECTURE.md "Deterministic
 * matching engine" for the parity test that guards this.
 *
 * ## Trigger policy
 * A rule "triggers" for a context when, for EVERY condition dimension the
 * rule has narrowed (a non-empty array/defined value), the context
 * satisfies it. A dimension the rule left empty is a wildcard — it never
 * blocks. A rule with every dimension empty always triggers (a general
 * fallback rule). `resourceCategoryIds` is a rule-authoring/editorial
 * dimension only: `MockIncidentContext` carries no resource-category field,
 * so this dimension is never evaluated by the engine (documented, not
 * silently ignored) — "Resource Category relevance where supported" is not
 * currently supported by the mock incident context.
 *
 * Jurisdiction: an unknown (`undefined`) context jurisdiction only satisfies
 * jurisdiction-agnostic rules (empty `rule.jurisdictions`) — it never
 * satisfies a jurisdiction-specific rule, so location-specific content is
 * never guessed for an unknown location.
 *
 * ## Ordering policy
 * 1. Rule priority ascending (lower number = higher precedence — priority 1
 *    outranks priority 2).
 * 2. Rule id ascending (stable, deterministic tie-break).
 * Within a rule, its own recommendation-id arrays are walked in their stored
 * order. Across rules, a record already added by a higher-priority rule
 * keeps its earlier position; a later rule recommending the same record only
 * contributes an additional match reason, never a duplicate entry or a
 * reordering. This is never a legal, clinical, risk, or safety score — it is
 * a content-ordering convenience only.
 */

export const MATCHING_ENGINE_VERSION = "1.0.0";

/**
 * Per-kind cap on how many recommendations the engine returns, applied after
 * deduplication. Centrally defined here (the ONE place) so no Frontend
 * component or Admin preview ever applies a different hidden limit. Chosen
 * to keep a single Triage page section readable regardless of how many rules
 * fire, while still surfacing every high-priority match first (limits apply
 * only after priority ordering).
 */
export const RESULT_LIMITS: Record<RecommendationKind, number> = {
  microcard: 6,
  rights_content: 4,
  support_organisation: 6,
  support_professional: 4,
  reporting_destination: 4,
  legislation_source: 4,
};

const RECOMMENDATION_FIELD_BY_KIND: Record<RecommendationKind, keyof PublishedMatchingRule> = {
  microcard: "microcardIds",
  rights_content: "rightsContentIds",
  support_organisation: "supportOrganisationIds",
  support_professional: "supportProfessionalIds",
  reporting_destination: "reportingDestinationIds",
  legislation_source: "legislationIds",
};

const BUNDLE_FIELD_BY_KIND: Record<RecommendationKind, keyof PublishedMockContentBundle["data"]> = {
  microcard: "microcards",
  rights_content: "rightsContent",
  support_organisation: "supportOrganisations",
  support_professional: "supportProfessionals",
  reporting_destination: "reportingDestinations",
  legislation_source: "legislationSources",
};

const RESULT_KEY_BY_KIND: Record<RecommendationKind, keyof MockMatchingResult["recommendations"]> = {
  microcard: "microcards",
  rights_content: "rightsContent",
  support_organisation: "supportOrganisations",
  support_professional: "supportProfessionals",
  reporting_destination: "reportingDestinations",
  legislation_source: "legislationSources",
};

function arraysOverlap(a: readonly string[], b: readonly string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const set = new Set(b);
  return a.some((value) => set.has(value));
}

function normalizedOverlap(a: readonly string[], b: readonly string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const set = new Set(b.map((v) => v.trim().toLowerCase()));
  return a.some((value) => set.has(value.trim().toLowerCase()));
}

export interface RuleTriggerEvaluation {
  triggered: boolean;
  reasons: MockMatchReason[];
}

/** Exported for the admin Test Matching panel's "why did / didn't this rule fire" transparency — the frontend never needs per-dimension detail, only the final result. */
export function evaluateRuleTrigger(rule: PublishedMatchingRule, context: MockIncidentContext): RuleTriggerEvaluation {
  const reasons: MockMatchReason[] = [];

  const pushReason = (code: MatchReasonCode, detail: string) => {
    reasons.push({ code, ruleId: rule.id, ruleName: rule.name, detail });
  };

  if (rule.topicKeys.length > 0) {
    if (!rule.topicKeys.includes(context.assistantTopic)) return { triggered: false, reasons: [] };
    pushReason("topic_match", `Assistant topic "${context.assistantTopic}" matches this rule's topic condition.`);
  }

  if (rule.incidentTypeIds.length > 0) {
    if (!arraysOverlap(rule.incidentTypeIds, context.incidentTypeIds)) return { triggered: false, reasons: [] };
    pushReason("incident_type_match", "At least one incident type overlaps this rule's condition.");
  }

  if (rule.triageLabelIds.length > 0) {
    if (!arraysOverlap(rule.triageLabelIds, context.triageLabelIds)) return { triggered: false, reasons: [] };
    pushReason("triage_label_match", "At least one triage label overlaps this rule's condition.");
  }

  if (rule.urgencyLevels.length > 0) {
    if (!context.urgency || !rule.urgencyLevels.includes(context.urgency)) return { triggered: false, reasons: [] };
  }

  if (rule.jurisdictions.length > 0) {
    if (!context.jurisdiction || !rule.jurisdictions.includes(context.jurisdiction)) return { triggered: false, reasons: [] };
    pushReason("jurisdiction_match", `Jurisdiction "${context.jurisdiction}" matches this rule's condition.`);
  } else {
    pushReason("australia_wide_fallback", "This rule has no jurisdiction condition, so it applies Australia-wide.");
  }

  if (rule.supportNeeds.length > 0) {
    if (!normalizedOverlap(rule.supportNeeds, context.supportNeeds)) return { triggered: false, reasons: [] };
    pushReason("support_need_match", "At least one support need overlaps this rule's condition.");
  }

  pushReason("rule_priority", `Rule priority ${rule.priority}.`);

  return { triggered: true, reasons };
}

interface ExcludedRelationship {
  ruleId: string;
  ruleName: string;
  kind: RecommendationKind;
  recordId: string;
  reason: string;
}

export interface MockMatchingDebugResult extends MockMatchingResult {
  /** Rules evaluated but that did not trigger — admin Test Matching transparency only. */
  notTriggeredRuleIds: string[];
  /** A rule's recommendation id that does not resolve to any record in this bundle — never invented, always surfaced. */
  excludedRelationships: ExcludedRelationship[];
}

/**
 * The full engine, always computed (the frontend-facing `runMockMatching`
 * below is this function with the debug-only fields dropped) — there is
 * only one algorithm, not a "simplified preview" and a "real" one.
 */
export function runMockMatchingDebug(
  bundleData: PublishedMockContentBundle["data"],
  context: MockIncidentContext
): MockMatchingDebugResult {
  const eligibleRules = bundleData.matchingRules.filter((r) => r.status === "published" && r.enabled);

  const sortedRules = [...eligibleRules].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.id.localeCompare(b.id);
  });

  const triggeredRuleIds: string[] = [];
  const notTriggeredRuleIds: string[] = [];
  const excludedRelationships: ExcludedRelationship[] = [];

  const buckets: Record<RecommendationKind, Map<string, MockMatchedRecommendation>> = {
    microcard: new Map(),
    rights_content: new Map(),
    support_organisation: new Map(),
    support_professional: new Map(),
    reporting_destination: new Map(),
    legislation_source: new Map(),
  };

  const recommendationKinds = Object.keys(RECOMMENDATION_FIELD_BY_KIND) as RecommendationKind[];

  const recordIdSets = Object.fromEntries(
    recommendationKinds.map((kind) => [kind, new Set(bundleData[BUNDLE_FIELD_BY_KIND[kind]].map((r) => r.id))])
  ) as Record<RecommendationKind, Set<string>>;

  for (const rule of sortedRules) {
    const { triggered, reasons } = evaluateRuleTrigger(rule, context);
    if (!triggered) {
      notTriggeredRuleIds.push(rule.id);
      continue;
    }
    triggeredRuleIds.push(rule.id);

    for (const kind of recommendationKinds) {
      const ids = rule[RECOMMENDATION_FIELD_BY_KIND[kind]] as string[];
      for (const recordId of ids) {
        if (!recordIdSets[kind].has(recordId)) {
          excludedRelationships.push({
            ruleId: rule.id,
            ruleName: rule.name,
            kind,
            recordId,
            reason: "Referenced record is not present in this published content bundle.",
          });
          continue;
        }
        const existing = buckets[kind].get(recordId);
        if (existing) {
          existing.reasons.push(...reasons);
        } else {
          buckets[kind].set(recordId, { kind, recordId, reasons: [...reasons] });
        }
      }
    }
  }

  const recommendations = Object.fromEntries(
    recommendationKinds.map((kind) => [RESULT_KEY_BY_KIND[kind], [...buckets[kind].values()].slice(0, RESULT_LIMITS[kind])])
  ) as MockMatchingResult["recommendations"];

  return {
    contractSchemaVersion: "1.0.0",
    matchingEngineVersion: MATCHING_ENGINE_VERSION,
    triggeredRuleIds,
    notTriggeredRuleIds,
    excludedRelationships,
    recommendations,
  };
}

/** The frontend/public-facing entry point — same computation, debug fields stripped. */
export function runMockMatching(bundleData: PublishedMockContentBundle["data"], context: MockIncidentContext): MockMatchingResult {
  const debugResult = runMockMatchingDebug(bundleData, context);
  return {
    contractSchemaVersion: debugResult.contractSchemaVersion,
    matchingEngineVersion: debugResult.matchingEngineVersion,
    triggeredRuleIds: debugResult.triggeredRuleIds,
    recommendations: debugResult.recommendations,
  };
}
