import { z } from "zod";

/**
 * The five Assistant entry topics the frontend routes on
 * (`/dashboard?view=assistant&topic=...`). Shared vocabulary between a
 * Matching Rule's "Assistant Topics" condition and the frontend's topic
 * registry — see docs/ARCHITECTURE.md "Phase 6 — Matching Rules." Kept as
 * its own small file (not folded into matching-rule.ts) since it is a
 * public-contract concept, not a matching-rule-only one.
 */
export const ASSISTANT_TOPIC_KEYS = [
  "general_assistant",
  "domestic_violence",
  "racial_abuse",
  "cyber_scam",
  "migrant_challenges",
] as const;
export type AssistantTopicKey = (typeof ASSISTANT_TOPIC_KEYS)[number];
export const assistantTopicKeySchema = z.enum(ASSISTANT_TOPIC_KEYS);

export const ASSISTANT_TOPIC_LABEL: Record<AssistantTopicKey, string> = {
  general_assistant: "General Assistant",
  domestic_violence: "Domestic Violence",
  racial_abuse: "Racial Abuse",
  cyber_scam: "Cyber Scam",
  migrant_challenges: "Migrant Challenges",
};
