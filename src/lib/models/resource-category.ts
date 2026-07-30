import { z } from "zod";

import { baseRecordSchema } from "@/lib/models/base";
import { taxonomyBaseFields } from "@/lib/models/taxonomy-base";

/**
 * A small curated allow-list mapped to existing @tabler/icons-react
 * components (see lib/taxonomy/resource-icons.ts for the component map) —
 * never an arbitrary icon URL or custom SVG markup.
 */
export const RESOURCE_CATEGORY_ICON_KEYS = [
  "safety",
  "legal",
  "mental_health",
  "housing",
  "financial",
  "discrimination",
  "workplace",
  "children",
  "emergency",
  "general",
] as const;
export type ResourceCategoryIconKey = (typeof RESOURCE_CATEGORY_ICON_KEYS)[number];

/**
 * The same tone vocabulary already used by Badge/status components
 * (src/components/ui/badge.tsx) — never a custom hex colour.
 */
export const RESOURCE_CATEGORY_ACCENT_TOKENS = ["primary", "success", "warning", "destructive", "neutral"] as const;
export type ResourceCategoryAccentToken = (typeof RESOURCE_CATEGORY_ACCENT_TOKENS)[number];

export const resourceCategorySchema = baseRecordSchema.extend({
  name: z.string().min(1),
  description: z.string().optional(),
  /** Legacy Phase 1 field, preserved for compatibility. Category hierarchy is out of scope for Phase 3 — the admin UI stays flat. */
  parentCategoryId: z.string().optional(),
  ...taxonomyBaseFields,
  iconKey: z.enum(RESOURCE_CATEGORY_ICON_KEYS).optional(),
  accentToken: z.enum(RESOURCE_CATEGORY_ACCENT_TOKENS).optional(),
});
export type ResourceCategory = z.infer<typeof resourceCategorySchema>;
